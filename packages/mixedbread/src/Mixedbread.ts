import MixedbreadClient from "@mixedbread/sdk"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { Digest } from "effect/crypto"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as ChildProcess from "effect/process/ChildProcess"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import { syncApiReference } from "./ApiReferenceSync.ts"
import {
  generateApiReferenceFiles,
  type LocalFile,
} from "./ApiReferenceFiles.ts"
import {
  DEFAULT_BLOG_DIRECTORY,
  DEFAULT_API_REFERENCE_DIRECTORY,
  DEFAULT_DOCUMENTATION_DIRECTORY,
  type DeleteOptions,
  type PreviewSyncOptions,
  type SyncOptions,
  type SyncScope,
  UPLOAD_CONCURRENCY,
} from "./Config.ts"
import {
  FailedToDeleteError,
  FailedToIndexError,
  InvalidStoreError,
  UnknownError,
} from "./Error.ts"
import {
  markdownOverlayKey,
  markdownSyncArguments,
  markdownSyncMetadata,
  stageBlog,
  stageDocumentation,
} from "./MarkdownSync.ts"
import { planOverlay, type ProductionFile } from "./OverlaySync.ts"
import { makeStoreClient } from "./Store.ts"

type MixedbreadError =
  | FailedToDeleteError
  | FailedToIndexError
  | InvalidStoreError
  | UnknownError

const DocumentationFileMetadata = Schema.Struct({
  content_source: Schema.optional(
    Schema.Union([Schema.Literal("docs"), Schema.Literal("documentation")]),
  ),
  file_path: Schema.String,
})

export class Mixedbread extends Context.Service<
  Mixedbread,
  {
    readonly syncPreview: (
      options: PreviewSyncOptions,
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
    const apiKey = yield* Config.Redacted("MXBAI_ADMIN_API_KEY")
    const configuredStoreId = yield* Config.option(
      Config.Redacted("MXBAI_VECTOR_STORE_ID"),
    )
    const productionStoreId = yield* Config.option(
      Config.Redacted("MXBAI_PRODUCTION_STORE_ID"),
    )
    const storePrefix = yield* Config.String("MXBAI_PREVIEW_STORE_PREFIX").pipe(
      Config.withDefault("effect-website-pr-"),
    )
    const branch = yield* Config.String("GITHUB_HEAD_REF").pipe(
      Config.orElse(() => Config.String("GITHUB_REF_NAME")),
      Config.withDefault("unknown"),
    )
    const repository = yield* Config.String("GITHUB_REPOSITORY").pipe(
      Config.withDefault("Effect-TS/website"),
    )
    const contentDir = yield* Config.String("CONTENT_DIRECTORY").pipe(
      Config.withDefault(DEFAULT_DOCUMENTATION_DIRECTORY),
    )
    const blogContentDir = yield* Config.String("BLOG_CONTENT_DIRECTORY").pipe(
      Config.withDefault(DEFAULT_BLOG_DIRECTORY),
    )
    const apiReferenceDir = yield* Config.String(
      "API_REFERENCE_DIRECTORY",
    ).pipe(Config.withDefault(DEFAULT_API_REFERENCE_DIRECTORY))
    const documentationStageDir = yield* Config.String(
      "DOCUMENTATION_STAGE_DIRECTORY",
    ).pipe(Config.withDefault(".data/mixedbread/documentation"))
    const blogStageDir = yield* Config.String("BLOG_STAGE_DIRECTORY").pipe(
      Config.withDefault(".data/mixedbread/blog"),
    )
    const version = yield* Config.Number("MXBAI_STORE_VERSION").pipe(
      Config.withDefault(2),
    )

    const digest = yield* Digest.Digest
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const childProcesses = yield* ChildProcessSpawner.ChildProcessSpawner
    const client = new MixedbreadClient({ apiKey: Redacted.value(apiKey) })
    const stores = makeStoreClient({ client, repository, storePrefix })

    const hash = Effect.fn("Mixedbread.hash")(function* (bytes: Uint8Array) {
      return yield* digest.digestHex(Digest.sha256, bytes)
    })

    const documentationPattern = `${documentationStageDir}/**/*.{md,mdx}`
    const blogPattern = `${blogStageDir}/**/*.mdx`

    const requireStoreId = (
      name: string,
      storeId: Option.Option<Redacted.Redacted<string>>,
      purpose: string,
    ) =>
      Option.match(storeId, {
        onNone: () =>
          Effect.fail(
            new InvalidStoreError({
              message: `${name} is required when ${purpose}`,
            }),
          ),
        onSome: (id) => Effect.succeed(Redacted.value(id)),
      })

    const stageMarkdown = Effect.fn("Mixedbread.stageMarkdown")(function* () {
      yield* Effect.all(
        [
          stageDocumentation({
            contentDir,
            stageDir: documentationStageDir,
          }).pipe(
            Effect.provideService(FileSystem.FileSystem, fs),
            Effect.provideService(Path.Path, path),
          ),
          stageBlog({
            contentDir: blogContentDir,
            stageDir: blogStageDir,
          }).pipe(
            Effect.provideService(FileSystem.FileSystem, fs),
            Effect.provideService(Path.Path, path),
          ),
        ],
        { concurrency: "unbounded", discard: true },
      )
    })

    const syncMarkdown = Effect.fn("Mixedbread.syncMarkdown")(function* (
      storeId: string,
      options: SyncOptions,
      filePatterns: ReadonlyArray<string>,
    ) {
      const command = ChildProcess.make(
        "pnpm",
        markdownSyncArguments({
          filePatterns,
          metadata: markdownSyncMetadata(options, version),
          storeId,
        }),
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
          externalId: filePatterns.join(", "),
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
      const files = yield* Stream.runCollect(stores.listFiles(storeId))
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
          yield* stores.deleteFile(storeId, file)
          yield* Effect.log(
            `Deleted legacy documentation file: ${file.external_id}`,
          )
        }),
        { concurrency: UPLOAD_CONCURRENCY },
      )
    })

    const apiReferenceFiles = () =>
      generateApiReferenceFiles(apiReferenceDir, hash)

    const syncMarkdownStore = Effect.fn("Mixedbread.syncMarkdownStore")(
      function* (storeId: string, options: SyncOptions) {
        yield* stageMarkdown()
        yield* syncMarkdown(storeId, options, [
          documentationPattern,
          blogPattern,
        ])
        yield* deleteLegacyDocumentation(storeId)
      },
    )

    const syncApiReferenceFiles = (
      store: MixedbreadClient.Store,
      options: SyncOptions,
      files: ReadonlyArray<LocalFile>,
    ) =>
      syncApiReference({
        branch,
        client,
        files,
        store,
        stores,
        sync: options,
        version,
      })

    const syncApiReferenceStore = Effect.fn("Mixedbread.syncApiReferenceStore")(
      function* (store: MixedbreadClient.Store, options: SyncOptions) {
        yield* syncApiReferenceFiles(store, options, yield* apiReferenceFiles())
      },
    )

    const isApiReference = (file: ProductionFile) =>
      file.external_id?.startsWith("api-reference/") === true

    // Uploads the staged markdown files that differ from production to the
    // preview store and returns the production files the preview must hide.
    const syncMarkdownOverlay = Effect.fn("Mixedbread.syncMarkdownOverlay")(
      function* (
        store: MixedbreadClient.Store,
        production: ReadonlyArray<MixedbreadClient.Stores.StoreFile>,
        options: PreviewSyncOptions,
      ) {
        yield* stageMarkdown()
        const staged = yield* Effect.all(
          [fs.glob(documentationPattern), fs.glob(blogPattern)],
          { concurrency: "unbounded" },
        ).pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        const local = yield* Effect.forEach(
          staged.flat(),
          Effect.fnUntraced(function* (filePath) {
            const bytes = yield* fs
              .readFile(filePath)
              .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
            const absolutePath = path.resolve(filePath)
            return {
              externalId: markdownOverlayKey(absolutePath),
              fileHash: `sha256:${yield* hash(bytes)}`,
              path: absolutePath,
            }
          }),
          { concurrency: "unbounded" },
        )
        const plan = planOverlay(
          local,
          production
            .filter((file) => !isApiReference(file))
            .map((file) => ({
              ...file,
              external_id: markdownOverlayKey(file.external_id ?? ""),
            })),
          version,
        )
        yield* Effect.log(
          `Markdown overlay for ${store.name}: ${plan.upload.length} files to upload, ${plan.hidden.length} production files hidden, ${local.length - plan.upload.length} unchanged`,
        )

        // Drop what an earlier push uploaded and production now matches.
        const uploading = new Set(plan.upload.map((file) => file.externalId))
        const leftovers = (yield* Stream.runCollect(
          stores.listFiles(store.id),
        )).filter(
          (file) =>
            !isApiReference(file) &&
            !uploading.has(markdownOverlayKey(file.external_id ?? "")),
        )
        yield* Effect.forEach(
          leftovers,
          (file) => stores.deleteFile(store.id, file),
          { concurrency: UPLOAD_CONCURRENCY, discard: true },
        )

        if (plan.upload.length > 0) {
          yield* syncMarkdown(
            store.id,
            options,
            plan.upload.map((file) => file.path),
          )
        }
        return plan.hidden
      },
    )

    // A preview store holds only what differs from production. Production
    // files it replaces or deletes are listed in the store's metadata.
    const syncPreview = Effect.fn("Mixedbread.syncPreview")(function* (
      options: PreviewSyncOptions,
    ) {
      const productionId = yield* requireStoreId(
        "MXBAI_PRODUCTION_STORE_ID",
        productionStoreId,
        "synchronizing a preview",
      )
      const store = yield* stores.resolve(options)
      const production = yield* Stream.runCollect(
        stores.listFiles(productionId),
      )
      const apiReference = yield* apiReferenceFiles()
      const apiReferencePlan = planOverlay(
        apiReference,
        production.filter(isApiReference),
        version,
      )
      const [markdownHidden] = yield* Effect.all(
        [
          syncMarkdownOverlay(store, production, options),
          syncApiReferenceFiles(store, options, apiReferencePlan.upload),
        ],
        { concurrency: "unbounded" },
      )
      const hidden = [...markdownHidden, ...apiReferencePlan.hidden]
      yield* stores.recordPreviewSync(store, options, hidden)
      yield* Effect.log(
        `Preview store ${store.name} hides ${hidden.length} production files`,
      )
    })

    const syncProduction = Effect.fn("Mixedbread.syncProduction")(function* (
      revision: string,
      scope: SyncScope = "all",
    ) {
      const storeId = yield* requireStoreId(
        "MXBAI_VECTOR_STORE_ID",
        configuredStoreId,
        "synchronizing production",
      )
      const options: SyncOptions = { kind: "production", revision, storeId }
      const store = yield* stores.resolve(options)
      yield* Effect.all(
        [
          ...(scope === "all" || scope === "markdown"
            ? [syncMarkdownStore(store.id, options)]
            : []),
          ...(scope === "all" || scope === "api-reference"
            ? [syncApiReferenceStore(store, options)]
            : []),
        ],
        { concurrency: "unbounded", discard: true },
      )
      yield* Effect.log(`Production store synchronized (${scope}): ${store.id}`)
    })

    const deleteStore = stores.deletePreview

    return {
      syncPreview,
      syncProduction,
      deleteStore,
    } as const
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
