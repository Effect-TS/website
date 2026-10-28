import MixedbreadClient from "@mixedbread/sdk"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { syncApiReference } from "./ApiReferenceSync.ts"
import { generateApiReferenceFiles } from "./ApiReferenceFiles.ts"
import { generateChangelogFiles } from "./ChangelogFiles.ts"
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
  generateBlogFiles,
  generateDocumentationFiles,
} from "./MarkdownFiles.ts"
import { makeStoreClient } from "./Store.ts"

type MixedbreadError =
  | FailedToDeleteError
  | FailedToIndexError
  | InvalidStoreError
  | UnknownError

const LegacyMarkdownFileMetadata = Schema.Struct({ file_path: Schema.String })

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
      wait?: boolean,
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
    const version = yield* Config.Number("MXBAI_STORE_VERSION").pipe(
      Config.withDefault(2),
    )

    const crypto = yield* Crypto.Crypto
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const client = new MixedbreadClient({ apiKey: Redacted.value(apiKey) })
    const stores = makeStoreClient({ client, repository, storePrefix })

    const hash = Effect.fn("Mixedbread.hash")(function* (bytes: Uint8Array) {
      const digest = yield* crypto
        .digest("SHA-256", bytes)
        .pipe(Effect.mapError((cause) => new UnknownError({ cause })))
      return Hex.encode(digest)
    })

    // Docs and blog used to be uploaded as Markdown files and split by
    // Mixedbread. Only those carry a `file_path`; their chunks lack the
    // metadata search needs, so they go once the new files are in.
    const deleteLegacyMarkdown = Effect.fn("Mixedbread.deleteLegacyMarkdown")(
      function* (storeId: string) {
        const files = yield* Stream.runCollect(stores.listFiles(storeId))
        const legacyFiles = files.filter((file) =>
          Schema.is(LegacyMarkdownFileMetadata)(file.metadata),
        )
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
              `Deleted legacy Markdown file: ${file.external_id}`,
            )
          }),
          { concurrency: UPLOAD_CONCURRENCY },
        )
      },
    )

    const apiReferenceFiles = Effect.fnUntraced(function* () {
      const api = yield* generateApiReferenceFiles(apiReferenceDir, hash)
      const changelog = yield* generateChangelogFiles(apiReferenceDir, hash)
      return [...api, ...changelog]
    })

    const syncMarkdownStore = Effect.fn("Mixedbread.syncMarkdownStore")(
      function* (store: MixedbreadClient.Store, options: SyncOptions) {
        const [documentation, blog] = yield* Effect.all([
          generateDocumentationFiles(contentDir, hash),
          generateBlogFiles(blogContentDir, hash),
        ]).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
          Effect.provideService(Path.Path, path),
        )
        yield* syncApiReference({
          branch,
          client,
          files: [...documentation, ...blog],
          store,
          stores,
          sync: options,
          version,
          prefixes: ["documentation/", "blog/"],
          label: "documentation and blog",
        })
        yield* deleteLegacyMarkdown(store.id)
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
          ? [syncMarkdownStore(store, options)]
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

    const syncProduction = (
      revision: string,
      scope: SyncScope = "all",
      wait = false,
    ) =>
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
              wait,
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
