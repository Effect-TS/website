import MixedbreadClient, { NotFoundError } from "@mixedbread/sdk"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import {
  API_MAX_RETRIES,
  type DeleteOptions,
  type PreviewSyncOptions,
  type SyncOptions,
} from "./Config.ts"
import { InvalidStoreError, UnknownError } from "./Error.ts"

export const StoreMetadata = Schema.Struct({
  lifecycle: Schema.Literal("pull-request-preview"),
  pullRequest: Schema.Int,
  repository: Schema.NonEmptyString,
  revision: Schema.optional(Schema.String),
})
export type StoreMetadata = typeof StoreMetadata.Type
export type StoreMetadataEncoded = typeof StoreMetadata.Encoded

// A copy normally finishes within minutes.
const COPY_TIMEOUT = "20 minutes"

export const StoreFileMetadata = Schema.Struct({
  file_hash: Schema.String,
  version: Schema.Int,
})

export const makeClient = (
  apiKey: string,
  fetch?: typeof globalThis.fetch,
): MixedbreadClient =>
  new MixedbreadClient({
    apiKey,
    maxRetries: API_MAX_RETRIES,
    ...(fetch === undefined ? {} : { fetch }),
  })

export interface StoreClient {
  readonly deletePreview: (
    options: DeleteOptions,
  ) => Effect.Effect<void, InvalidStoreError | UnknownError>
  readonly listFiles: (
    storeId: string,
  ) => Stream.Stream<MixedbreadClient.Stores.StoreFile, UnknownError>
  readonly recordPreviewSync: (
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
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value)
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

  const exists = (storeId: string) =>
    Effect.tryPromise({
      try: () => client.stores.retrieve(storeId),
      catch: (cause) => new UnknownError({ cause }),
    }).pipe(
      Effect.as(true),
      Effect.catchIf(
        (error) => error.cause instanceof NotFoundError,
        () => Effect.succeed(false),
      ),
    )

  const resolve: StoreClient["resolve"] = Effect.fn("Store.resolve")(
    function* (sync) {
      const retrieve = Effect.tryPromise({
        try: () => client.stores.retrieve(sync.storeId),
        catch: (cause) => new UnknownError({ cause }),
      })
      let store = yield* retrieve
      // Preview stores are copied from production, and neither side of a
      // copy accepts file changes until it finishes.
      if (store.copy_state?.status === "in_progress") {
        const copy = store.copy_state
        yield* Effect.log(
          `Waiting for the copy involving store ${store.name} to finish (${copy.role} of a copy with store ${copy.peer_store_id}, started ${copy.started_at})`,
        )
        const wait = Effect.gen(function* () {
          while (store.copy_state?.status === "in_progress") {
            // A preview deleted mid-copy leaves the source reporting the copy
            // long after its target is gone; nothing is left to wait for.
            if (
              store.copy_state.role === "source" &&
              !(yield* exists(store.copy_state.peer_store_id))
            ) {
              yield* Effect.logWarning(
                `Store ${store.name} still reports a copy into deleted store ${store.copy_state.peer_store_id}; synchronizing anyway`,
              )
              return
            }
            yield* Effect.sleep("5 seconds")
            store = yield* retrieve
          }
        })
        yield* wait.pipe(
          Effect.timeoutOrElse({
            duration: COPY_TIMEOUT,
            orElse: () =>
              Effect.fail(
                new InvalidStoreError({
                  message: `Timed out after ${COPY_TIMEOUT} waiting for the copy involving store ${store.name} (peer ${store.copy_state?.peer_store_id}) to finish`,
                }),
              ),
          }),
        )
      }
      if (sync.kind === "preview") {
        if (store.name !== storeName(sync.pullRequest)) {
          return yield* new InvalidStoreError({
            message: `Refusing to synchronize store ${store.name}: expected preview store ${storeName(sync.pullRequest)}`,
          })
        }
        yield* validate(store, sync.pullRequest)
      }
      return store
    },
  )

  const recordPreviewSync: StoreClient["recordPreviewSync"] = Effect.fn(
    "Store.recordPreviewSync",
  )(function* (store, sync) {
    const currentMetadata = isRecord(store.metadata) ? store.metadata : {}
    yield* Effect.tryPromise({
      try: () =>
        client.stores.update(store.id, {
          metadata: { ...currentMetadata, ...metadata(sync) },
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

  return { deletePreview, listFiles, recordPreviewSync, resolve }
}
