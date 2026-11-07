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
import { planOverlay, syncApiReference } from "./ApiReferenceSync.ts"
import { generateApiReferenceFiles } from "./ApiReferenceFiles.ts"
import {
  DEFAULT_BLOG_DIRECTORY,
  DEFAULT_API_REFERENCE_DIRECTORY,
  DEFAULT_DOCUMENTATION_DIRECTORY,
  type DeleteOptions,
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
  markdownOverlayArguments,
  markdownOverlayKey,
  markdownSyncArguments,
  markdownSyncMetadata,
  stageBlog,
  stageDocumentation,
} from "./MarkdownSync.ts"
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

    const syncMarkdown = Effect.fn("Mixedbread.syncMarkdown")(function* (
      storeId: string,
      options: SyncOptions,
    ) {
      const metadata = markdownSyncMetadata(options, version)
      const command = ChildProcess.make(
        "pnpm",
        markdownSyncArguments({
          blogStageDir,
          documentationStageDir,
          metadata,
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

    const apiReferenceFiles = () =>
      generateApiReferenceFiles(apiReferenceDir, hash)

    const syncMarkdownStore = Effect.fn("Mixedbread.syncMarkdownStore")(
      function* (storeId: string, options: SyncOptions) {
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
          {
            concurrency: "unbounded",
            discard: true,
          },
        )
        yield* syncMarkdown(storeId, options)
        yield* deleteLegacyDocumentation(storeId)
      },
    )

    const syncApiReferenceStore = Effect.fn("Mixedbread.syncApiReferenceStore")(
      function* (
        store: MixedbreadClient.Store,
        options: SyncOptions,
        production?: MixedbreadClient.Store,
      ) {
        const files = yield* apiReferenceFiles()
        return yield* syncApiReference({
          branch,
          client,
          files,
          ...(production === undefined ? {} : { production }),
          store,
          stores,
          sync: options,
          version,
        })
      },
    )

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

    // Uploads the markdown files that differ from production to the preview
    // store and returns the production files the preview must hide.
    const syncMarkdownOverlay = Effect.fn("Mixedbread.syncMarkdownOverlay")(
      function* (
        store: MixedbreadClient.Store,
        production: MixedbreadClient.Store,
        options: SyncOptions,
      ) {
        yield* stageMarkdown()
        const globs = yield* Effect.all(
          [
            fs.glob(`${documentationStageDir}/**/*.{md,mdx}`),
            fs.glob(`${blogStageDir}/**/*.mdx`),
          ],
          { concurrency: "unbounded" },
        ).pipe(Effect.mapError((cause) => new UnknownError({ cause })))
        const local = yield* Effect.forEach(
          globs.flat(),
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
        const productionFiles = (yield* Stream.runCollect(
          stores.listFiles(production.id),
        ))
          .filter(
            (file) =>
              file.external_id !== null &&
              file.external_id !== undefined &&
              !file.external_id.startsWith("api-reference/"),
          )
          .map((file) => ({
            ...file,
            external_id: markdownOverlayKey(file.external_id ?? ""),
          }))
        const plan = planOverlay(local, productionFiles, version)
        yield* Effect.log(
          `Markdown overlay for ${store.name}: ${plan.upload.length} files to upload, ${plan.hidden.length} production files hidden, ${local.length - plan.upload.length} unchanged`,
        )
        if (plan.upload.length > 0) {
          const command = ChildProcess.make(
            "pnpm",
            markdownOverlayArguments({
              filePaths: plan.upload.map((file) => file.path),
              metadata: markdownSyncMetadata(options, version),
              storeId: store.id,
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
              externalId: `${documentationStageDir}, ${blogStageDir}`,
              cause: new Error(`Mixedbread CLI exited with code ${exitCode}`),
            })
          }
        } else {
          // Nothing differs from production now; drop what an earlier push
          // uploaded.
          const leftovers = (yield* Stream.runCollect(
            stores.listFiles(store.id),
          )).filter((file) => !file.external_id?.startsWith("api-reference/"))
          yield* Effect.forEach(
            leftovers,
            Effect.fnUntraced(function* (file) {
              yield* Effect.tryPromise({
                try: () =>
                  client.stores.files.delete(file.id, {
                    store_identifier: store.id,
                  }),
                catch: (cause) => new FailedToDeleteError({ file, cause }),
              })
            }),
            { concurrency: UPLOAD_CONCURRENCY },
          )
        }
        return plan.hidden
      },
    )

    const syncOverlay = Effect.fn("Mixedbread.syncOverlay")(function* (
      store: MixedbreadClient.Store,
      options: SyncOptions & { readonly kind: "preview" },
      productionId: string,
    ) {
      const production = yield* Effect.tryPromise({
        try: () => client.stores.retrieve(productionId),
        catch: (cause) => new UnknownError({ cause }),
      })
      yield* Effect.log(
        `Production store ${production.name}: ${production.file_counts?.total ?? "?"} files, ${production.usage_bytes} bytes, ${production.usage_tokens} tokens, copy_state ${production.copy_state?.status ?? "none"}`,
      )
      const [markdownHidden, apiReferenceHidden] = yield* Effect.all(
        [
          syncMarkdownOverlay(store, production, options),
          syncApiReferenceStore(store, options, production),
        ],
        { concurrency: "unbounded" },
      )
      const hidden = [...markdownHidden, ...apiReferenceHidden]
      yield* stores.recordPreviewSync(store, options, hidden)
      yield* Effect.log(
        `Preview store ${store.name} hides ${hidden.length} production files`,
      )
    })

    const syncStore = Effect.fn("Mixedbread.syncStore")(function* (
      options: SyncOptions,
      scope: SyncScope = "all",
    ) {
      const store = yield* stores.resolve(options)

      if (options.kind === "preview" && Option.isSome(productionStoreId)) {
        if (scope !== "all") {
          return yield* new InvalidStoreError({
            message: `Overlay synchronization needs scope "all", received "${scope}"`,
          })
        }
        yield* syncOverlay(
          store,
          options,
          Redacted.value(productionStoreId.value),
        )
        return
      }

      const synchronizations = [
        ...(scope === "all" || scope === "markdown"
          ? [syncMarkdownStore(store.id, options)]
          : []),
        ...(scope === "all" || scope === "api-reference"
          ? [syncApiReferenceStore(store, options)]
          : []),
      ]
      yield* Effect.all(synchronizations, {
        concurrency: "unbounded",
        discard: true,
      })

      if (options.kind === "preview") {
        yield* stores.recordPreviewSync(store, options)
      }

      yield* Effect.log(
        `${options.kind === "preview" ? "Preview" : "Production"} store synchronized (${scope}): ${store.id}`,
      )
    })

    const deleteStore = stores.deletePreview

    const syncProduction = (revision: string, scope: SyncScope = "all") =>
      Option.match(configuredStoreId, {
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
