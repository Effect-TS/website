import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import MixedbreadClient, { toFile, type Uploadable } from "@mixedbread/sdk"
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
import * as NodeFs from "node:fs"
import { ApiReference } from "../../src/features/api-reference/ApiReference.ts"
import { loadApiReferenceDataset } from "../../src/features/api-reference/dataset.ts"

type MixedbreadError = FailedToDeleteError | FailedToIndexError | InvalidStoreError | UnknownError

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

const MAX_MIXEDBREAD_TEXT_LENGTH = 65_536

interface SyncOptions {
  readonly pullRequest: number
  readonly revision: string
}

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
    readonly syncStore: (options: SyncOptions) => Effect.Effect<void, MixedbreadError>
    readonly deleteStore: (
      options: DeleteOptions,
    ) => Effect.Effect<void, InvalidStoreError | UnknownError, never>
  }
>()("Mixedbread", {
  make: Effect.gen(function* () {
    const apiKey = yield* Config.redacted("MXBAI_PREVIEW_ADMIN_API_KEY")
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
    const apiReferenceDir = yield* Config.string("API_REFERENCE_DIRECTORY").pipe(
      Config.withDefault(".data/api-reference"),
    )
    const version = yield* Config.number("PREVIEW_STORE_VERSION").pipe(Config.withDefault(1))

    const crypto = yield* Crypto.Crypto
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const client = new MixedbreadClient({ apiKey: Redacted.value(apiKey) })

    const getStoreName = (pullRequest: number): string => `${storePrefix}${pullRequest}`

    const getStoreDescription = (pullRequest: number) =>
      `Effect website search preview for PR ${pullRequest}`

    const getStoreMetadata = (options: SyncOptions): StoreMetadataEncoded => ({
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

    const toGuideFile = Effect.fn("Mixedbread.toGuideFile")(function* (filePath: string) {
      const bytes = yield* fs.readFile(filePath)
      const externalId = filePath.split(path.sep).join("/")
      return {
        externalId,
        fileHash: yield* hash(bytes),
        metadata: {
          content_source: "docs",
          file_path: externalId,
        },
        upload: () => NodeFs.createReadStream(filePath),
      } satisfies LocalFile
    })

    const apiReferenceFiles = Effect.fn("Mixedbread.apiReferenceFiles")(function* () {
      const entries = yield* Effect.tryPromise({
        try: () => loadApiReferenceDataset(apiReferenceDir),
        catch: (cause) => new UnknownError({ cause }),
      })
      if (entries.length === 0) {
        return yield* new UnknownError({
          cause: new Error(`No API reference dataset found in ${apiReferenceDir}`),
        })
      }

      return yield* Effect.forEach(
        entries,
        Effect.fnUntraced(function* (entry) {
          const reflection = yield* Effect.tryPromise({
            try: () => ApiReference.loadReflection(entry.data, { baseDirectory: apiReferenceDir }),
            catch: (cause) => new UnknownError({ cause }),
          })
          const apiModule = ApiReference.moduleView(reflection)
          const moduleName = entry.data.modulePath.split("/").at(-1) ?? entry.data.modulePath
          const moduleHref = `/docs/api/${entry.data.version}/${entry.data.packageSlug}/${entry.data.modulePath}`
          const declarations = apiModule.groups.flatMap((group) => group.declarations)
          if (
            new Set(declarations.map((declaration) => declaration.anchor)).size !==
            declarations.length
          ) {
            return yield* new UnknownError({
              cause: new Error(`Duplicate API declaration anchors in ${entry.id}`),
            })
          }
          const chunks = declarations.map((declaration, chunkIndex) => ({
            type: "text",
            text: declarationMarkdown({
              declaration,
              modulePath: entry.data.modulePath,
              packageName: entry.data.packageName,
              declarationHref: `${moduleHref}#${declaration.anchor}`,
            }),
            mime_type: "text/plain",
            chunk_index: chunkIndex,
            generated_metadata: {
              type: "text",
              declaration_anchor: declaration.anchor,
              declaration_kind: declaration.kind,
              declaration_name: declaration.name,
              signature: (declaration.signature ?? "").slice(0, 8_000),
            },
          }))
          const oversizedChunk = chunks.find(
            (chunk) => chunk.text.length > MAX_MIXEDBREAD_TEXT_LENGTH,
          )
          if (oversizedChunk !== undefined) {
            return yield* new UnknownError({
              cause: new Error(
                `API search chunk exceeds ${MAX_MIXEDBREAD_TEXT_LENGTH} characters in ${entry.id}`,
              ),
            })
          }
          const bytes = new TextEncoder().encode(JSON.stringify(chunks))
          const externalId = [
            "api-reference",
            entry.data.version,
            entry.data.packageSlug,
            `${entry.data.modulePath}.mxjson`,
          ].join("/")
          return {
            externalId,
            fileHash: yield* hash(bytes),
            metadata: {
              api_version: entry.data.version,
              content_source: "api-reference",
              module_href: moduleHref,
              module_name: moduleName,
              module_path: entry.data.modulePath,
              package_name: entry.data.packageName,
              package_slug: entry.data.packageSlug,
            },
            upload: () =>
              toFile(bytes, `${moduleName}.mxjson`, {
                type: "application/vnd-mxbai.chunks-json",
              }),
          } satisfies LocalFile
        }),
        { concurrency: 10 },
      )
    })

    const decodeStoreMetadata = Schema.decodeUnknownEffect(StoreMetadata)

    const decodeStoreFileMetadata = Schema.decodeUnknownEffect(StoreFileMetadata)

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
      if (metadata.repository !== repository || metadata.pullRequest !== pullRequest) {
        return yield* new InvalidStoreError({
          message: `Refusing to modify store ${store.name}: preview ownership metadata does not match`,
        })
      }
    })

    const listFiles = (storeId: string) =>
      Stream.paginate<string | null, MixedbreadClient.Stores.StoreFile, UnknownError>(
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

    const createStore = Effect.fn("Mixedbread.createStore")(function* (options: SyncOptions) {
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

    const findStore = Effect.fn("Mixedbread.findStore")(function* (storeName: string) {
      const cursor = yield* Effect.tryPromise({
        try: () => client.stores.list({ q: storeName, limit: 100 }),
        catch: (cause) => new UnknownError({ cause }),
      })
      return yield* Stream.fromAsyncIterable(cursor, (cause) => new UnknownError({ cause })).pipe(
        Stream.run(Sink.find((store) => store.name === storeName)),
      )
    })

    const syncStore = Effect.fn("Mixedbread.syncStore")(function* (options: SyncOptions) {
      const storeName = getStoreName(options.pullRequest)

      const store = yield* findStore(storeName).pipe(
        Effect.flatMap(Effect.fromOption),
        Effect.catchTag("NoSuchElementError", () => createStore(options)),
      )

      yield* validateStore(store, options.pullRequest)

      const guideFiles = yield* fs.glob(`${contentDir}/**/*.mdx`).pipe(
        Effect.flatMap(Effect.forEach(toGuideFile, { concurrency: "unbounded" })),
        Effect.mapError((cause) => new UnknownError({ cause })),
      )
      const localFiles = [...guideFiles, ...(yield* apiReferenceFiles())]
      const duplicateIds = Map.groupBy(localFiles, (file) => file.externalId)
        .entries()
        .filter(([, files]) => files.length > 1)
        .map(([externalId]) => externalId)
        .toArray()
      if (duplicateIds.length > 0) {
        return yield* new UnknownError({
          cause: new Error(`Duplicate Mixedbread external IDs: ${duplicateIds.join(", ")}`),
        })
      }

      const storeFiles = yield* Stream.runCollect(listFiles(store.id))
      const storeFilesById = new Map(
        storeFiles.flatMap((file) =>
          Predicate.isNullish(file.external_id) ? [] : [[file.external_id, file]],
        ),
      )
      const desiredIds = new Set(localFiles.map(({ externalId }) => externalId))

      const changedFiles = yield* Effect.filter(
        localFiles,
        Effect.fnUntraced(
          function* ({ externalId, fileHash }) {
            const storeFile = storeFilesById.get(externalId)

            if (storeFile === undefined) {
              return true
            }

            const metadata = yield* decodeStoreFileMetadata(storeFile.metadata)

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
      yield* Effect.log(
        `Synchronizing ${changed} changed and ${unchanged} unchanged files to ${store.name}`,
      )

      yield* Effect.forEach(
        changedFiles,
        Effect.fnUntraced(function* ({ externalId, fileHash, metadata, upload }) {
          const now = yield* DateTime.now

          const result = yield* Effect.tryPromise({
            try: async () =>
              client.stores.files.uploadAndPoll({
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
                    pull_request: options.pullRequest,
                    synced: true,
                    uploaded_at: DateTime.formatIso(now),
                  },
                },
              }),
            catch: (cause) => new FailedToIndexError({ externalId, cause }),
          })

          if (storeFile.status === "failed" || storeFile.status === "cancelled") {
            return yield* new FailedToIndexError({
              externalId,
              cause: storeFile.last_error ?? storeFile.status,
            })
          }

          yield* Effect.log(`Uploaded: ${externalId}`)
        }),
        { concurrency: 10 },
      )

      const staleFiles = storeFiles.filter(
        (file) => Predicate.isNotNullish(file.external_id) && !desiredIds.has(file.external_id),
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
          yield* Effect.log(`Deleted stale file: ${file.external_id}`)
        }),
        { concurrency: FILE_OPERATION_CONCURRENCY },
      )

      yield* Effect.tryPromise({
        try: () =>
          client.stores.update(store.id, {
            expires_after: { anchor: "last_active_at", days: 7 },
            metadata: getStoreMetadata(options),
          }),
        catch: (cause) => new UnknownError({ cause }),
      })

      if (Option.isSome(outputPath)) {
        yield* Effect.orDie(fs.writeFileString(outputPath.value, `store_id=${store.id}\n`))
      }

      yield* Effect.log(`Preview store synchronized: ${store.id}`)
    })

    const deleteStore = Effect.fn("Mixedbread.deleteStore")(function* (options: DeleteOptions) {
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

    return {
      syncStore,
      deleteStore,
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}

const pullRequest = Flag.integer("pr").pipe(
  Flag.withDescription("Pull request number that identifies the preview store"),
)

const revision = Flag.string("sha").pipe(
  Flag.withDescription("Git commit SHA associated with the indexed content"),
)

const syncCommand = Command.make("sync", { pullRequest, revision }).pipe(
  Command.withDescription("Create or update a pull request's Mixedbread preview store"),
  Command.withHandler((options) => Mixedbread.use((mixedbread) => mixedbread.syncStore(options))),
)

const deleteCommand = Command.make("delete", { pullRequest }).pipe(
  Command.withDescription("Delete a pull request's Mixedbread preview store"),
  Command.withHandler(({ pullRequest }) =>
    Mixedbread.use((mixedbread) => mixedbread.deleteStore({ pullRequest })),
  ),
)

const previewCommand = Command.make("preview").pipe(
  Command.withDescription("Manage per-pull-request Mixedbread preview stores"),
  Command.withSubcommands([syncCommand, deleteCommand]),
)

const program = Command.run(previewCommand, {
  version: "0.0.0",
})

const MainLayer = Mixedbread.layer.pipe(
  Layer.provideMerge([CliConfig.layer({ builtIns: [Help] }), NodeServices.layer]),
  Layer.orDie,
)

program.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)

function declarationMarkdown(options: {
  readonly declaration: ReturnType<
    typeof ApiReference.moduleView
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
  if (declaration.since !== undefined) sections.push(`Since: ${declaration.since}`)
  if (declaration.signature !== undefined) {
    sections.push("", "## Signature", "", "```typescript", declaration.signature, "```")
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
