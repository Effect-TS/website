import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import MixedbreadClient, {
  ConflictError,
  toFile,
  type Uploadable,
} from "@mixedbread/sdk"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Crypto from "effect/Crypto"
import * as Data from "effect/Data"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as CliConfig from "effect/unstable/cli/CliConfig"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import { Help } from "effect/unstable/cli/GlobalFlag"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { ApiReference } from "../../src/features/api-reference/ApiReference.ts"
import { loadApiReferenceDataset } from "../../src/features/api-reference/dataset.ts"
import * as Blog from "./blog.ts"
import * as Documentation from "./documentation.ts"

type MixedbreadError =
  | FailedToDeleteError
  | FailedToIndexError
  | InvalidStoreError
  | UnknownError

class FailedToDeleteError extends Data.TaggedError("FailedToDeleteError")<{
  readonly file: MixedbreadClient.Stores.StoreFile
  readonly cause?: unknown | undefined
}> {
  override get message(): string {
    return `Mixedbread failed to delete file: ${this.file.external_id}`
  }
}

class FailedToIndexError extends Data.TaggedError("FailedToIndexError")<{
  readonly externalId: string
  readonly cause?: unknown | undefined
}> {
  override get message(): string {
    return `Mixedbread failed to index ${this.externalId}`
  }
}

class FileInProgressError extends Data.TaggedError("FileInProgressError")<{
  readonly externalId: string
  readonly fileIdentifier: string
  readonly cause: ConflictError
}> {}

class InvalidStoreError extends Data.TaggedError("InvalidStoreError")<{
  readonly message: string
  readonly cause?: unknown | undefined
}> {}

class UnknownError extends Data.TaggedError("UnknownError")<{
  readonly cause: unknown
}> {}

const StoreMetadata = Schema.Struct({
  lifecycle: Schema.Literal("pull-request-preview"),
  pullRequest: Schema.Int,
  repository: Schema.NonEmptyString,
  revision: Schema.String,
})
type StoreMetadata = typeof StoreMetadata.Type
type StoreMetadataEncoded = typeof StoreMetadata.Encoded

const StoreFileMetadata = Schema.Struct({
  file_hash: Schema.String,
  version: Schema.Int,
})
type StoreFileMetadata = typeof StoreFileMetadata.Type

const DocumentationFileMetadata = Schema.Struct({
  content_source: Schema.optional(
    Schema.Union([Schema.Literal("docs"), Schema.Literal("documentation")]),
  ),
  file_path: Schema.String,
})

const MAX_MIXEDBREAD_TEXT_LENGTH = 65_536
const MAX_API_CHUNKS_PER_FILE = 250
const UPLOAD_CONCURRENCY = 100
const FILE_UPLOAD_ATTEMPTS = 3
const BLOG_CONTENT_PATTERNS = [
  "cause-and-effect/*.mdx",
  "this-week-in-effect/*/index.mdx",
  "releases/effect/*.mdx",
  "releases/schema/*.mdx",
  "releases/*.mdx",
  "*.mdx",
] as const

interface PreviewSyncOptions {
  readonly kind: "preview"
  readonly pullRequest: number
  readonly revision: string
}

interface ProductionSyncOptions {
  readonly kind: "production"
  readonly revision: string
  readonly storeId: string
}

type SyncOptions = PreviewSyncOptions | ProductionSyncOptions
type SyncScope = "all" | "markdown" | "api-reference"

interface DeleteOptions {
  readonly pullRequest: number
}

interface LocalFile {
  readonly externalId: string
  readonly fileHash: string
  readonly metadata: Readonly<Record<string, string>>
  readonly upload: () => Promise<Uploadable> | Uploadable
}

class Mixedbread extends Context.Service<
  Mixedbread,
  {
    readonly syncStore: (
      options: SyncOptions,
      scope?: SyncScope,
    ) => Effect.Effect<void, MixedbreadError>
    readonly syncProduction: (
      revision: string,
      scope?: SyncScope,
    ) => Effect.Effect<void, MixedbreadError>
    readonly deleteStore: (
      options: DeleteOptions,
    ) => Effect.Effect<void, InvalidStoreError | UnknownError, never>
  }
>()("Mixedbread", {
  make: Effect.gen(function* () {
    const apiKey = yield* Config.redacted("MXBAI_API_KEY")
    const productionStoreId = yield* Config.option(
      Config.redacted("MXBAI_VECTOR_STORE_ID"),
    )
    const storePrefix = yield* Config.string("MXBAI_PREVIEW_STORE_PREFIX").pipe(
      Config.withDefault("effect-website-pr-"),
    )
    const outputPath = yield* Config.option(Config.string("GITHUB_OUTPUT"))
    const branch = yield* Config.string("GITHUB_HEAD_REF").pipe(
      Config.orElse(() => Config.string("GITHUB_REF_NAME")),
      Config.withDefault("unknown"),
    )
    const repository = yield* Config.string("GITHUB_REPOSITORY").pipe(
      Config.withDefault("Effect-TS/website"),
    )
    const contentDir = yield* Config.string("CONTENT_DIRECTORY").pipe(
      Config.withDefault("src/content/docs"),
    )
    const blogContentDir = yield* Config.string("BLOG_CONTENT_DIRECTORY").pipe(
      Config.withDefault("src/content/blog"),
    )
    const apiReferenceDir = yield* Config.string(
      "API_REFERENCE_DIRECTORY",
    ).pipe(Config.withDefault(".data/api-reference"))
    const documentationStageDir = yield* Config.string(
      "DOCUMENTATION_STAGE_DIRECTORY",
    ).pipe(Config.withDefault(".data/mixedbread/documentation"))
    const blogStageDir = yield* Config.string("BLOG_STAGE_DIRECTORY").pipe(
      Config.withDefault(".data/mixedbread/blog"),
    )
    const version = yield* Config.number("MXBAI_STORE_VERSION").pipe(
      Config.withDefault(2),
    )

    const crypto = yield* Crypto.Crypto
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner
    const client = new MixedbreadClient({ apiKey: Redacted.value(apiKey) })

    const getStoreName = (pullRequest: number): string =>
      `${storePrefix}${pullRequest}`

    const getStoreDescription = (pullRequest: number) =>
      `Effect website search preview for PR ${pullRequest}`

    const getStoreMetadata = (
      options: PreviewSyncOptions,
    ): StoreMetadataEncoded => ({
      lifecycle: "pull-request-preview",
      pullRequest: options.pullRequest,
      repository: repository,
      revision: options.revision,
    })

    const hash = Effect.fn("Mixedbread.hash")(function* (bytes: Uint8Array) {
      const digest = yield* crypto
        .digest("SHA-256", bytes)
        .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
      return Encoding.encodeHex(digest)
    })

    const stageDocumentation = Effect.fn("Mixedbread.stageDocumentation")(
      function* () {
        yield* fs
          .remove(documentationStageDir, { recursive: true, force: true })
          .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        const filePaths = yield* fs
          .glob(`${contentDir}/**/*.{md,mdx}`)
          .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        const staged = yield* Effect.forEach(
          filePaths,
          Effect.fnUntraced(function* (filePath) {
            const source = yield* fs
              .readFileString(filePath)
              .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
            const relativePath = path.relative(contentDir, filePath)
            const document = yield* Effect.try({
              try: () => Documentation.stageDocument(source, relativePath),
              catch: (cause) => new UnknownError({ cause }),
            })
            if (document === undefined) return false

            const destination = path.join(documentationStageDir, relativePath)
            yield* fs
              .makeDirectory(path.dirname(destination), { recursive: true })
              .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
            yield* fs
              .writeFileString(destination, document.source)
              .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
            return true
          }),
          { concurrency: "unbounded" },
        )
        const count = staged.filter(Boolean).length
        if (count === 0) {
          return yield* new UnknownError({
            cause: new Error("No documentation files to index"),
          })
        }
        yield* Effect.log(
          `Staged ${count} documentation files in ${documentationStageDir}`,
        )
      },
    )

    const stageBlog = Effect.fn("Mixedbread.stageBlog")(function* () {
      yield* fs
        .remove(blogStageDir, { recursive: true, force: true })
        .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
      const nestedFilePaths = yield* Effect.forEach(
        BLOG_CONTENT_PATTERNS,
        (pattern) =>
          fs
            .glob(`${blogContentDir}/${pattern}`)
            .pipe(Effect.mapError((cause) => new UnknownError({ cause }))),
        { concurrency: "unbounded" },
      )
      const filePaths = [...new Set(nestedFilePaths.flat())]
      const staged = yield* Effect.forEach(
        filePaths,
        Effect.fnUntraced(function* (filePath) {
          const source = yield* fs
            .readFileString(filePath)
            .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
          const relativePath = path.relative(blogContentDir, filePath)
          const post = yield* Effect.try({
            try: () => Blog.stageBlogPost(source, relativePath),
            catch: (cause) => new UnknownError({ cause }),
          })
          if (post === undefined) return false

          const destination = path.join(blogStageDir, relativePath)
          yield* fs
            .makeDirectory(path.dirname(destination), { recursive: true })
            .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
          yield* fs
            .writeFileString(destination, post.source)
            .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
          return true
        }),
        { concurrency: "unbounded" },
      )
      const count = staged.filter(Boolean).length
      if (count === 0) {
        return yield* new UnknownError({
          cause: new Error("No blog posts to index"),
        })
      }
      yield* Effect.log(`Staged ${count} blog posts in ${blogStageDir}`)
    })

    const syncMarkdown = Effect.fn("Mixedbread.syncMarkdown")(function* (
      storeId: string,
      options: SyncOptions,
    ) {
      const metadata = JSON.stringify({
        content_source: "markdown",
        version,
        ...(options.kind === "preview"
          ? { pull_request: options.pullRequest }
          : {}),
      })
      const command = ChildProcess.make(
        "pnpm",
        [
          "exec",
          "mxbai",
          "store",
          "sync",
          storeId,
          `${documentationStageDir}/**/*.{md,mdx}`,
          `${blogStageDir}/**/*.mdx`,
          "--yes",
          "--strategy",
          "fast",
          "--max-chunk-size",
          "500",
          "--metadata",
          metadata,
        ],
        {
          env: { MXBAI_API_KEY: Redacted.value(apiKey) },
          extendEnv: true,
          stdout: "inherit",
          stderr: "inherit",
        },
      )
      const exitCode = yield* childProcesses
        .exitCode(command)
        .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
      if (exitCode !== 0) {
        return yield* new FailedToIndexError({
          externalId: `${documentationStageDir}, ${blogStageDir}`,
          cause: new Error(`Mixedbread CLI exited with code ${exitCode}`),
        })
      }
    })

    const deleteLegacyDocumentation = Effect.fn(
      "Mixedbread.deleteLegacyDocumentation",
    )(function* (storeId: string) {
      const stagePath = documentationStageDir
        .replace(/\\/g, "/")
        .replace(/^\.\//, "")
      const files = yield* Stream.runCollect(listFiles(storeId))
      const legacyFiles = files.filter((file) => {
        if (!Schema.is(DocumentationFileMetadata)(file.metadata)) return false
        const filePath = file.metadata.file_path.replace(/\\/g, "/")
        const isDocumentation =
          file.metadata.content_source === "docs" ||
          file.metadata.content_source === "documentation" ||
          filePath.includes("/src/content/docs/") ||
          filePath.startsWith("src/content/docs/")
        return isDocumentation && !filePath.includes(stagePath)
      })
      yield* Effect.forEach(
        legacyFiles,
        Effect.fnUntraced(function* (file) {
          yield* Effect.tryPromise({
            try: () =>
              client.stores.files.delete(file.id, {
                store_identifier: storeId,
              }),
            catch: (cause) => new FailedToDeleteError({ file, cause }),
          })
          yield* Effect.log(
            `Deleted legacy documentation file: ${file.external_id}`,
          )
        }),
        { concurrency: UPLOAD_CONCURRENCY },
      )
    })

    const apiReferenceFiles = Effect.fn("Mixedbread.apiReferenceFiles")(
      function* () {
        const entries = yield* Effect.tryPromise({
          try: () => loadApiReferenceDataset(apiReferenceDir),
          catch: (cause) => new UnknownError({ cause }),
        })
        if (entries.length === 0) {
          return yield* new UnknownError({
            cause: new Error(
              `No API reference dataset found in ${apiReferenceDir}`,
            ),
          })
        }

        const packageFiles = yield* Effect.forEach(
          Map.groupBy(
            entries,
            (entry) => `${entry.data.version}/${entry.data.packageSlug}`,
          ),
          Effect.fnUntraced(function* ([, packageEntries]) {
            const packageEntry = packageEntries[0]
            if (packageEntry === undefined) {
              return yield* new UnknownError({
                cause: new Error("Empty API package group"),
              })
            }
            const nestedChunks = yield* Effect.forEach(
              packageEntries,
              Effect.fnUntraced(function* (entry) {
                const reflection = yield* Effect.tryPromise({
                  try: () =>
                    ApiReference.loadReflection(entry.data, {
                      baseDirectory: apiReferenceDir,
                    }),
                  catch: (cause) => new UnknownError({ cause }),
                })
                const moduleView = yield* Effect.tryPromise({
                  try: () => ApiReference.moduleView(reflection),
                  catch: (cause) => new UnknownError({ cause }),
                })
                const declarations = moduleView.groups.flatMap(
                  (group) => group.declarations,
                )
                if (
                  new Set(declarations.map((declaration) => declaration.anchor))
                    .size !== declarations.length
                ) {
                  return yield* new UnknownError({
                    cause: new Error(
                      `Duplicate API declaration anchors in ${entry.id}`,
                    ),
                  })
                }
                const moduleName =
                  entry.data.modulePath.split("/").at(-1) ??
                  entry.data.modulePath
                const moduleHref = `/docs/${entry.data.version}/api/${entry.data.packageSlug}/${entry.data.modulePath}`
                const chunks = declarations.map((declaration) => ({
                  type: "text",
                  text: declarationMarkdown({
                    declaration,
                    modulePath: entry.data.modulePath,
                    packageName: entry.data.packageName,
                    declarationHref: `${moduleHref}#${declaration.anchor}`,
                  }),
                  mime_type: "text/plain",
                  generated_metadata: {
                    type: "text",
                    declaration_anchor: declaration.anchor,
                    declaration_kind: declaration.kind,
                    declaration_name: declaration.name,
                    module_href: moduleHref,
                    module_name: moduleName,
                    module_path: entry.data.modulePath,
                    signature: (declaration.signature ?? "").slice(0, 8_000),
                  },
                }))
                if (
                  chunks.some(
                    (chunk) => chunk.text.length > MAX_MIXEDBREAD_TEXT_LENGTH,
                  )
                ) {
                  return yield* new UnknownError({
                    cause: new Error(
                      `API search chunk exceeds ${MAX_MIXEDBREAD_TEXT_LENGTH} characters in ${entry.id}`,
                    ),
                  })
                }
                return chunks
              }),
              { concurrency: 10 },
            )
            const chunks = nestedChunks.flat()
            const shards = Array.from(
              { length: Math.ceil(chunks.length / MAX_API_CHUNKS_PER_FILE) },
              (_, index) =>
                chunks.slice(
                  index * MAX_API_CHUNKS_PER_FILE,
                  (index + 1) * MAX_API_CHUNKS_PER_FILE,
                ),
            )
            return yield* Effect.forEach(shards, (shard, index) => {
              const suffix = String(index + 1).padStart(3, "0")
              const filename = `${packageEntry.data.packageSlug}-${suffix}.mxjson`
              const bytes = new TextEncoder().encode(JSON.stringify(shard))
              return hash(bytes).pipe(
                Effect.map(
                  (fileHash) =>
                    ({
                      externalId: [
                        "api-reference",
                        packageEntry.data.version,
                        filename,
                      ].join("/"),
                      fileHash,
                      metadata: {
                        api_version: packageEntry.data.version,
                        content_source: "api-reference",
                        package_name: packageEntry.data.packageName,
                        package_slug: packageEntry.data.packageSlug,
                      },
                      upload: () =>
                        toFile(bytes, filename, {
                          type: "application/vnd-mxbai.chunks-json",
                        }),
                    }) satisfies LocalFile,
                ),
              )
            })
          }),
          { concurrency: 10 },
        )
        return packageFiles.flat()
      },
    )

    const decodeStoreMetadata = Schema.decodeUnknownEffect(StoreMetadata)

    const decodeStoreFileMetadata =
      Schema.decodeUnknownEffect(StoreFileMetadata)

    const validateStore = Effect.fn("Mixedbread.validateStore")(function* (
      store: MixedbreadClient.Store,
      pullRequest: number,
    ) {
      const metadata = yield* decodeStoreMetadata(store.metadata).pipe(
        Effect.mapError(
          (cause) =>
            new InvalidStoreError({
              message: `Refusing to modify store ${store.name}: store metadata invalid`,
              cause,
            }),
        ),
      )
      if (
        metadata.repository !== repository ||
        metadata.pullRequest !== pullRequest
      ) {
        return yield* new InvalidStoreError({
          message: `Refusing to modify store ${store.name}: preview ownership metadata does not match`,
        })
      }
    })

    const listFiles = (storeId: string) =>
      Stream.paginate<
        string | null,
        MixedbreadClient.Stores.StoreFile,
        UnknownError
      >(
        null,
        Effect.fnUntraced(function* (after) {
          const response = yield* Effect.tryPromise({
            try: () =>
              client.stores.files.list(storeId, {
                limit: 100,
                ...(Predicate.isNullish(after) ? {} : { after }),
              }),
            catch: (cause) => new UnknownError({ cause }),
          })
          return response.pagination.has_more
            ? [response.data, Option.some(response.pagination.last_cursor)]
            : [response.data, Option.none<string | null>()]
        }),
      ).pipe(Stream.withSpan("Mixedbread.listFiles"))

    const createStore = Effect.fn("Mixedbread.createStore")(function* (
      options: PreviewSyncOptions,
    ) {
      const store = yield* Effect.tryPromise({
        try: () =>
          client.stores.create({
            name: getStoreName(options.pullRequest),
            description: getStoreDescription(options.pullRequest),
            expires_after: { anchor: "last_active_at", days: 7 },
            metadata: getStoreMetadata(options),
            config: {
              contextualization: {
                with_file_context: true,
                with_metadata: ["file_path"],
              },
            },
          }),
        catch: (cause) => new UnknownError({ cause }),
      })
      yield* Effect.log(`Created Mixedbread preview store: ${store.id}`)
      return store
    })

    const findStore = Effect.fn("Mixedbread.findStore")(function* (
      storeName: string,
    ) {
      const cursor = yield* Effect.tryPromise({
        try: () => client.stores.list({ q: storeName, limit: 100 }),
        catch: (cause) => new UnknownError({ cause }),
      })
      return yield* Stream.fromAsyncIterable(
        cursor,
        (cause) => new UnknownError({ cause }),
      ).pipe(Stream.run(Sink.find((store) => store.name === storeName)))
    })

    const syncMarkdownStore = Effect.fn("Mixedbread.syncMarkdownStore")(
      function* (storeId: string, options: SyncOptions) {
        yield* Effect.all([stageDocumentation(), stageBlog()], {
          concurrency: "unbounded",
          discard: true,
        })
        yield* syncMarkdown(storeId, options)
        yield* deleteLegacyDocumentation(storeId)
      },
    )

    const syncApiReference = Effect.fn("Mixedbread.syncApiReference")(
      function* (store: MixedbreadClient.Store, options: SyncOptions) {
        const localFiles = yield* apiReferenceFiles()
        const duplicateIds = Map.groupBy(localFiles, (file) => file.externalId)
          .entries()
          .filter(([, files]) => files.length > 1)
          .map(([externalId]) => externalId)
          .toArray()
        if (duplicateIds.length > 0) {
          return yield* new UnknownError({
            cause: new Error(
              `Duplicate Mixedbread external IDs: ${duplicateIds.join(", ")}`,
            ),
          })
        }

        const storeFiles = (yield* Stream.runCollect(
          listFiles(store.id),
        )).filter((file) => file.external_id?.startsWith("api-reference/"))
        const storeFilesById = new Map(
          storeFiles.flatMap((file) =>
            Predicate.isNullish(file.external_id)
              ? []
              : [[file.external_id, file]],
          ),
        )
        const desiredIds = new Set(
          localFiles.map(({ externalId }) => externalId),
        )

        const changedFiles = yield* Effect.filter(
          localFiles,
          Effect.fnUntraced(
            function* ({ externalId, fileHash }) {
              const storeFile = storeFilesById.get(externalId)

              if (storeFile === undefined) {
                return true
              }

              const metadata = yield* decodeStoreFileMetadata(
                storeFile.metadata,
              )

              return (
                metadata.file_hash !== fileHash ||
                metadata.version !== version ||
                storeFile.status === "failed" ||
                storeFile.status === "cancelled"
              )
            },
            Effect.catchTag("SchemaError", () => Effect.succeed(true)),
          ),
        )

        const changed = changedFiles.length
        const unchanged = localFiles.length - changed
        const staleFiles = storeFiles.filter(
          (file) =>
            Predicate.isNotNullish(file.external_id) &&
            !desiredIds.has(file.external_id),
        )
        yield* Effect.log(
          changed === 0
            ? `API reference index for ${store.name} is up to date; no uploads required (${unchanged} files unchanged)`
            : `Uploading ${changed} changed API reference files to ${store.name} (${unchanged} files unchanged)`,
        )

        yield* Effect.forEach(
          staleFiles,
          Effect.fnUntraced(function* (file) {
            yield* Effect.tryPromise({
              try: () =>
                client.stores.files.delete(file.id, {
                  store_identifier: store.id,
                }),
              catch: (cause) => new FailedToDeleteError({ file, cause }),
            })
            yield* Effect.log(
              `Deleted stale API reference file: ${file.external_id}`,
            )
          }),
          { concurrency: UPLOAD_CONCURRENCY },
        )

        yield* Effect.forEach(
          changedFiles,
          Effect.fnUntraced(function* ({
            externalId,
            fileHash,
            metadata,
            upload,
          }) {
            const now = yield* DateTime.now
            const uploadFile = (
              attempt: number,
            ): Effect.Effect<
              MixedbreadClient.Stores.StoreFile,
              FailedToIndexError
            > =>
              Effect.tryPromise({
                try: async () =>
                  client.stores.files.upload({
                    storeIdentifier: store.id,
                    file: await upload(),
                    body: {
                      external_id: externalId,
                      overwrite: true,
                      config: { parsing_strategy: "fast" },
                      metadata: {
                        ...metadata,
                        file_hash: fileHash,
                        git_branch: branch,
                        git_commit: options.revision,
                        version,
                        ...(options.kind === "preview"
                          ? { pull_request: options.pullRequest }
                          : {}),
                        synced: true,
                        uploaded_at: DateTime.formatIso(now),
                      },
                    },
                  }),
                catch: (cause) => {
                  const conflict = fileInProgressConflict(cause)
                  return conflict === undefined
                    ? new FailedToIndexError({ externalId, cause })
                    : new FileInProgressError({ externalId, ...conflict })
                },
              }).pipe(
                Effect.catchTag("FileInProgressError", (error) =>
                  Effect.gen(function* () {
                    const existing = yield* Effect.tryPromise({
                      try: () =>
                        client.stores.files.retrieve(error.fileIdentifier, {
                          store_identifier: store.id,
                        }),
                      catch: (cause) =>
                        new FailedToIndexError({ externalId, cause }),
                    })
                    const existingMetadata = existing.metadata
                    if (
                      existing.status !== "failed" &&
                      existing.status !== "cancelled" &&
                      Schema.is(StoreFileMetadata)(existingMetadata) &&
                      existingMetadata.file_hash === fileHash &&
                      existingMetadata.version === version
                    ) {
                      return existing
                    }
                    if (attempt >= FILE_UPLOAD_ATTEMPTS) {
                      return yield* new FailedToIndexError({
                        externalId: error.externalId,
                        cause: error.cause,
                      })
                    }
                    yield* Effect.tryPromise({
                      try: () =>
                        client.stores.files.delete(error.fileIdentifier, {
                          store_identifier: store.id,
                        }),
                      catch: (cause) =>
                        new FailedToIndexError({ externalId, cause }),
                    })
                    yield* Effect.sleep("1 second")
                    return yield* uploadFile(attempt + 1)
                  }),
                ),
              )

            const storeFile = yield* uploadFile(1)
            if (
              storeFile.status === "failed" ||
              storeFile.status === "cancelled"
            ) {
              return yield* new FailedToIndexError({
                externalId,
                cause: storeFile.last_error ?? storeFile.status,
              })
            }
            yield* Effect.log(`Synchronized API reference file: ${externalId}`)
          }),
          { concurrency: UPLOAD_CONCURRENCY },
        )
      },
    )

    const syncStore = Effect.fn("Mixedbread.syncStore")(function* (
      options: SyncOptions,
      scope: SyncScope = "all",
    ) {
      const store =
        options.kind === "preview"
          ? yield* findStore(getStoreName(options.pullRequest)).pipe(
              Effect.flatMap(Effect.fromOption),
              Effect.catchTag("NoSuchElementError", () => createStore(options)),
            )
          : yield* Effect.tryPromise({
              try: () => client.stores.retrieve(options.storeId),
              catch: (cause) => new UnknownError({ cause }),
            })

      if (options.kind === "preview")
        yield* validateStore(store, options.pullRequest)

      const synchronizations = [
        ...(scope === "all" || scope === "markdown"
          ? [syncMarkdownStore(store.id, options)]
          : []),
        ...(scope === "all" || scope === "api-reference"
          ? [syncApiReference(store, options)]
          : []),
      ]
      yield* Effect.all(synchronizations, {
        concurrency: "unbounded",
        discard: true,
      })

      if (options.kind === "preview") {
        yield* Effect.tryPromise({
          try: () =>
            client.stores.update(store.id, {
              expires_after: { anchor: "last_active_at", days: 7 },
              metadata: getStoreMetadata(options),
            }),
          catch: (cause) => new UnknownError({ cause }),
        })
      }

      if (Option.isSome(outputPath)) {
        yield* Effect.orDie(
          fs.writeFileString(outputPath.value, `store_id=${store.id}\n`),
        )
      }

      yield* Effect.log(
        `${options.kind === "preview" ? "Preview" : "Production"} store synchronized (${scope}): ${store.id}`,
      )
    })

    const deleteStore = Effect.fn("Mixedbread.deleteStore")(function* (
      options: DeleteOptions,
    ) {
      const storeName = getStoreName(options.pullRequest)
      const store = yield* findStore(storeName)
      if (Option.isNone(store)) {
        yield* Effect.log(`Preview store does not exist: ${storeName}`)
      } else {
        yield* validateStore(store.value, options.pullRequest)
        yield* Effect.tryPromise({
          try: () => client.stores.delete(store.value.id),
          catch: (cause) => new UnknownError({ cause }),
        })
        yield* Effect.log(`Deleted preview store: ${store.value.id}`)
      }
    })

    const syncProduction = (revision: string, scope: SyncScope = "all") =>
      Option.match(productionStoreId, {
        onNone: () =>
          Effect.fail(
            new InvalidStoreError({
              message:
                "MXBAI_VECTOR_STORE_ID is required when synchronizing production",
            }),
          ),
        onSome: (storeId) =>
          syncStore(
            {
              kind: "production",
              revision,
              storeId: Redacted.value(storeId),
            },
            scope,
          ),
      })

    return {
      syncStore,
      syncProduction,
      deleteStore,
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}

function fileInProgressConflict(
  cause: unknown,
):
  | { readonly cause: ConflictError; readonly fileIdentifier: string }
  | undefined {
  if (!(cause instanceof ConflictError)) return undefined
  const fileIdentifier =
    /File '([^']+)' with version '[^']+' and status 'in_progress'/.exec(
      cause.message,
    )?.[1]
  return fileIdentifier === undefined ? undefined : { cause, fileIdentifier }
}

const pullRequest = Flag.integer("pr").pipe(
  Flag.withDescription("Pull request number that identifies the preview store"),
  Flag.optional,
)

const revision = Flag.string("sha").pipe(
  Flag.withDescription("Git commit SHA associated with the indexed content"),
)

const scope = Flag.choice("scope", ["all", "markdown", "api-reference"]).pipe(
  Flag.withDefault("all"),
  Flag.withDescription("Content scope to synchronize"),
)

const deletePullRequest = Flag.integer("pr").pipe(
  Flag.withDescription("Pull request number that identifies the preview store"),
)

const syncCommand = Command.make("sync", { pullRequest, revision, scope }).pipe(
  Command.withDescription(
    "Synchronize a Mixedbread documentation search store",
  ),
  Command.withHandler(({ pullRequest, revision, scope }) =>
    Option.match(pullRequest, {
      onNone: () =>
        Mixedbread.use((mixedbread) =>
          mixedbread.syncProduction(revision, scope),
        ),
      onSome: (pullRequest) =>
        Mixedbread.use((mixedbread) =>
          mixedbread.syncStore(
            { kind: "preview", pullRequest, revision },
            scope,
          ),
        ),
    }),
  ),
)

const deleteCommand = Command.make("delete-preview", {
  pullRequest: deletePullRequest,
}).pipe(
  Command.withDescription("Delete a pull request's Mixedbread preview store"),
  Command.withHandler(({ pullRequest }) =>
    Mixedbread.use((mixedbread) => mixedbread.deleteStore({ pullRequest })),
  ),
)

const indexCommand = Command.make("index").pipe(
  Command.withDescription("Manage Mixedbread documentation search stores"),
  Command.withSubcommands([syncCommand, deleteCommand]),
)

const program = Command.run(indexCommand, {
  version: "0.0.0",
})

const MainLayer = Mixedbread.layer.pipe(
  Layer.provideMerge([
    CliConfig.layer({ builtIns: [Help] }),
    NodeServices.layer,
  ]),
  Layer.orDie,
)

program.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)

function declarationMarkdown(options: {
  readonly declaration: Awaited<
    ReturnType<typeof ApiReference.moduleView>
  >["groups"][number]["declarations"][number]
  readonly declarationHref: string
  readonly modulePath: string
  readonly packageName: string
}): string {
  const { declaration } = options
  const sections = [`# ${declaration.name}`]
  if (declaration.commentMarkdown !== undefined) {
    sections.push("", declaration.commentMarkdown)
  }
  sections.push(
    "",
    `Package: \`${options.packageName}\``,
    `Module: \`${options.modulePath}\``,
    `Kind: ${declaration.kind}`,
    `Category: ${declaration.category}`,
    `API reference: ${options.declarationHref}`,
  )
  if (declaration.since !== undefined)
    sections.push(`Since: ${declaration.since}`)
  if (declaration.signature !== undefined) {
    sections.push(
      "",
      "## Signature",
      "",
      "```typescript",
      declaration.signature,
      "```",
    )
  }
  for (const example of declaration.examples) {
    sections.push(
      "",
      `## ${example.title ?? "Example"}`,
      "",
      `\`\`\`${example.language}`,
      example.source,
      "```",
    )
  }
  return `${sections.join("\n")}\n`
}
