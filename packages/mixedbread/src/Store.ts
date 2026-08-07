import MixedbreadClient from "@mixedbread/sdk"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import type {
  DeleteOptions,
  PreviewSyncOptions,
  SyncOptions,
} from "./Config.ts"
import { InvalidStoreError, UnknownError } from "./Error.ts"

export const StoreMetadata = Schema.Struct({
  lifecycle: Schema.Literal("pull-request-preview"),
  pullRequest: Schema.Int,
  repository: Schema.NonEmptyString,
  revision: Schema.String,
})
export type StoreMetadata = typeof StoreMetadata.Type
export type StoreMetadataEncoded = typeof StoreMetadata.Encoded

export const StoreFileMetadata = Schema.Struct({
  file_hash: Schema.String,
  version: Schema.Int,
})

export interface StoreClient {
  readonly deletePreview: (
    options: DeleteOptions,
  ) => Effect.Effect<void, InvalidStoreError | UnknownError>
  readonly listFiles: (
    storeId: string,
  ) => Stream.Stream<MixedbreadClient.Stores.StoreFile, UnknownError>
  readonly refreshPreview: (
    store: MixedbreadClient.Store,
    options: PreviewSyncOptions,
  ) => Effect.Effect<void, UnknownError>
  readonly resolve: (
    options: SyncOptions,
  ) => Effect.Effect<MixedbreadClient.Store, InvalidStoreError | UnknownError>
}

export function makeStoreClient(options: {
  readonly client: MixedbreadClient
  readonly repository: string
  readonly storePrefix: string
}): StoreClient {
  const { client, repository, storePrefix } = options
  const decodeMetadata = Schema.decodeUnknownEffect(StoreMetadata)
  const storeName = (pullRequest: number): string =>
    `${storePrefix}${pullRequest}`
  const metadata = (sync: PreviewSyncOptions): StoreMetadataEncoded => ({
    lifecycle: "pull-request-preview",
    pullRequest: sync.pullRequest,
    repository,
    revision: sync.revision,
  })

  const validate = Effect.fn("Store.validate")(function* (
    store: MixedbreadClient.Store,
    pullRequest: number,
  ) {
    const decoded = yield* decodeMetadata(store.metadata).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidStoreError({
            message: `Refusing to modify store ${store.name}: store metadata invalid`,
            cause,
          }),
      ),
    )
    if (
      decoded.repository !== repository ||
      decoded.pullRequest !== pullRequest
    ) {
      return yield* new InvalidStoreError({
        message: `Refusing to modify store ${store.name}: preview ownership metadata does not match`,
      })
    }
  })

  const listFiles: StoreClient["listFiles"] = (storeId) =>
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
    ).pipe(Stream.withSpan("Store.listFiles"))

  const find = Effect.fn("Store.find")(function* (name: string) {
    const cursor = yield* Effect.tryPromise({
      try: () => client.stores.list({ q: name, limit: 100 }),
      catch: (cause) => new UnknownError({ cause }),
    })
    return yield* Stream.fromAsyncIterable(
      cursor,
      (cause) => new UnknownError({ cause }),
    ).pipe(Stream.run(Sink.find((store) => store.name === name)))
  })

  const create = Effect.fn("Store.create")(function* (
    sync: PreviewSyncOptions,
  ) {
    const store = yield* Effect.tryPromise({
      try: () =>
        client.stores.create({
          name: storeName(sync.pullRequest),
          description: `Effect website search preview for PR ${sync.pullRequest}`,
          expires_after: { anchor: "last_active_at", days: 7 },
          metadata: metadata(sync),
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

  const resolve: StoreClient["resolve"] = Effect.fn("Store.resolve")(
    function* (sync) {
      if (sync.kind === "production") {
        return yield* Effect.tryPromise({
          try: () => client.stores.retrieve(sync.storeId),
          catch: (cause) => new UnknownError({ cause }),
        })
      }
      const store = yield* find(storeName(sync.pullRequest)).pipe(
        Effect.flatMap(Effect.fromOption),
        Effect.catchTag("NoSuchElementError", () => create(sync)),
      )
      yield* validate(store, sync.pullRequest)
      return store
    },
  )

  const refreshPreview: StoreClient["refreshPreview"] = Effect.fn(
    "Store.refreshPreview",
  )(function* (store, sync) {
    yield* Effect.tryPromise({
      try: () =>
        client.stores.update(store.id, {
          expires_after: { anchor: "last_active_at", days: 7 },
          metadata: metadata(sync),
        }),
      catch: (cause) => new UnknownError({ cause }),
    })
  })

  const deletePreview: StoreClient["deletePreview"] = Effect.fn(
    "Store.deletePreview",
  )(function* ({ pullRequest }) {
    const name = storeName(pullRequest)
    const store = yield* find(name)
    if (Option.isNone(store)) {
      yield* Effect.log(`Preview store does not exist: ${name}`)
      return
    }
    yield* validate(store.value, pullRequest)
    yield* Effect.tryPromise({
      try: () => client.stores.delete(store.value.id),
      catch: (cause) => new UnknownError({ cause }),
    })
    yield* Effect.log(`Deleted preview store: ${store.value.id}`)
  })

  return { deletePreview, listFiles, refreshPreview, resolve }
}
