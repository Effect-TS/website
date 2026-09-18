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
import * as Stream from "effect/Stream"
import { syncFiles } from "./ApiReferenceSync.ts"
import { generateApiReferenceFiles } from "./ApiReferenceFiles.ts"
import { generateChangelogFiles } from "./ChangelogFiles.ts"
import {
  generateBlogFiles,
  generateDocumentationFiles,
} from "./MarkdownFiles.ts"
import {
  DEFAULT_BLOG_DIRECTORY,
  DEFAULT_API_REFERENCE_DIRECTORY,
  DEFAULT_CHANGELOG_DIRECTORY,
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
import { makeStoreClient } from "./Store.ts"

type MixedbreadError =
  | FailedToDeleteError
  | FailedToIndexError
  | InvalidStoreError
  | UnknownError

const isLegacyMarkdown = (metadata: unknown): boolean =>
  typeof metadata === "object" &&
  metadata !== null &&
  "content_source" in metadata &&
  (metadata as { content_source?: unknown }).content_source === "markdown"

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
    const changelogContentDir = yield* Config.String(
      "CHANGELOG_CONTENT_DIRECTORY",
    ).pipe(Config.withDefault(DEFAULT_CHANGELOG_DIRECTORY))
    const version = yield* Config.Number("MXBAI_STORE_VERSION").pipe(
      Config.withDefault(3),
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
      return Encoding.encodeHex(digest)
    })

    // Remove entries from the earlier CLI sync, which tagged every markdown file
    // with `content_source: "markdown"`. New uploads use per-type sources
    // (documentation/blog/changelog), so anything still tagged "markdown" is a
    // stale duplicate under a different external id the reconcile cannot see.
    const deleteLegacyMarkdown = Effect.fn("Mixedbread.deleteLegacyMarkdown")(
      function* (storeId: string) {
        const files = yield* Stream.runCollect(stores.listFiles(storeId))
        const legacyFiles = files.filter((file) =>
          isLegacyMarkdown(file.metadata),
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
              `Deleted legacy markdown file: ${file.external_id}`,
            )
          }),
          { concurrency: UPLOAD_CONCURRENCY },
        )
      },
    )

    const apiReferenceFiles = () =>
      generateApiReferenceFiles(apiReferenceDir, hash)

    const syncMarkdownStore = Effect.fn("Mixedbread.syncMarkdownStore")(
      function* (store: MixedbreadClient.Store, options: SyncOptions) {
        const [documentationFiles, blogFiles] = yield* Effect.all(
          [
            generateDocumentationFiles(contentDir, hash),
            generateBlogFiles(blogContentDir, hash),
          ],
          { concurrency: "unbounded" },
        ).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
          Effect.provideService(Path.Path, path),
        )
        // Fail loudly on an empty set. An empty upload would make syncFiles treat
        // every existing entry as stale and delete the whole corpus.
        if (documentationFiles.length === 0) {
          return yield* new UnknownError({
            cause: new Error("No documentation files to index"),
          })
        }
        if (blogFiles.length === 0) {
          return yield* new UnknownError({
            cause: new Error("No blog posts to index"),
          })
        }
        yield* deleteLegacyMarkdown(store.id)
        yield* syncFiles({
          branch,
          client,
          externalIdPrefix: "documentation/",
          maxChunkSize: 500,
          files: documentationFiles,
          label: "documentation",
          store,
          stores,
          sync: options,
          version,
        })
        yield* syncFiles({
          branch,
          client,
          externalIdPrefix: "blog/",
          maxChunkSize: 500,
          files: blogFiles,
          label: "blog",
          store,
          stores,
          sync: options,
          version,
        })
      },
    )

    const syncApiReferenceStore = Effect.fn("Mixedbread.syncApiReferenceStore")(
      function* (store: MixedbreadClient.Store, options: SyncOptions) {
        const files = yield* apiReferenceFiles()
        yield* syncFiles({
          branch,
          client,
          externalIdPrefix: "api-reference/",
          files,
          label: "API reference",
          store,
          stores,
          sync: options,
          version,
        })
      },
    )

    const syncChangelogStore = Effect.fn("Mixedbread.syncChangelogStore")(
      function* (store: MixedbreadClient.Store, options: SyncOptions) {
        const files = yield* generateChangelogFiles(
          changelogContentDir,
          hash,
        ).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
          Effect.provideService(Path.Path, path),
        )
        // Skip when no changelog data is present so a partial sync never deletes
        // an already-indexed changelog from the store.
        if (files.length === 0) {
          yield* Effect.log("No changelog files to index")
          return
        }
        yield* syncFiles({
          branch,
          client,
          externalIdPrefix: "changelog/",
          maxChunkSize: 500,
          files,
          label: "changelog",
          store,
          stores,
          sync: options,
          version,
        })
      },
    )

    // Completeness gate: fail the sync if a file this run manages did not finish
    // indexing, so a silently dropped document surfaces as a build failure
    // instead of a gap in search results. Scoped to the synced prefixes so a
    // partial sync never fails on an unrelated pre-existing failure.
    const verifyStore = Effect.fn("Mixedbread.verifyStore")(function* (
      storeId: string,
      prefixes: ReadonlyArray<string>,
    ) {
      const files = yield* Stream.runCollect(stores.listFiles(storeId))
      const broken = files.filter(
        (file) =>
          (file.status === "failed" || file.status === "cancelled") &&
          prefixes.some((prefix) => file.external_id?.startsWith(prefix)),
      )
      if (broken.length > 0) {
        return yield* new FailedToIndexError({
          externalId: broken
            .map((file) => file.external_id ?? file.id)
            .slice(0, 20)
            .join(", "),
          cause: new Error(
            `${broken.length} store file(s) failed indexing after sync`,
          ),
        })
      }
      yield* Effect.log(
        `Verified ${files.length} store files; all indexed successfully`,
      )
    })

    const syncStore = Effect.fn("Mixedbread.syncStore")(function* (
      options: SyncOptions,
      scope: SyncScope = "all",
    ) {
      const store = yield* stores.resolve(options)

      const syncsMarkdown = scope === "all" || scope === "markdown"
      const syncsApiReference = scope === "all" || scope === "api-reference"
      const synchronizations = [
        ...(syncsMarkdown
          ? [
              syncMarkdownStore(store, options),
              syncChangelogStore(store, options),
            ]
          : []),
        ...(syncsApiReference ? [syncApiReferenceStore(store, options)] : []),
      ]
      yield* Effect.all(synchronizations, {
        concurrency: "unbounded",
        discard: true,
      })

      const verifiedPrefixes = [
        ...(syncsMarkdown ? ["documentation/", "blog/", "changelog/"] : []),
        ...(syncsApiReference ? ["api-reference/"] : []),
      ]
      yield* verifyStore(store.id, verifiedPrefixes)

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
