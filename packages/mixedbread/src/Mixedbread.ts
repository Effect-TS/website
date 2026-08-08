import MixedbreadClient from "@mixedbread/sdk"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { syncApiReference } from "./ApiReferenceSync.ts"
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
      Config.withDefault(DEFAULT_DOCUMENTATION_DIRECTORY),
    )
    const blogContentDir = yield* Config.string("BLOG_CONTENT_DIRECTORY").pipe(
      Config.withDefault(DEFAULT_BLOG_DIRECTORY),
    )
    const apiReferenceDir = yield* Config.string(
      "API_REFERENCE_DIRECTORY",
    ).pipe(Config.withDefault(DEFAULT_API_REFERENCE_DIRECTORY))
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
    const stores = makeStoreClient({ client, repository, storePrefix })

    const hash = Effect.fn("Mixedbread.hash")(function* (bytes: Uint8Array) {
      const digest = yield* crypto
        .digest("SHA-256", bytes)
        .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
      return Encoding.encodeHex(digest)
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
      function* (store: MixedbreadClient.Store, options: SyncOptions) {
        const files = yield* apiReferenceFiles()
        yield* syncApiReference({
          branch,
          client,
          files,
          store,
          stores,
          sync: options,
          version,
        })
      },
    )

    const syncStore = Effect.fn("Mixedbread.syncStore")(function* (
      options: SyncOptions,
      scope: SyncScope = "all",
    ) {
      const store = yield* stores.resolve(options)

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
        yield* stores.refreshPreview(store, options)
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

    const deleteStore = stores.deletePreview

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
