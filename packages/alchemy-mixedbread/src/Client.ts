import MixedbreadSdk, { ConflictError, NotFoundError } from "@mixedbread/sdk"
import type {
  Store,
  StoreCopyParams,
  StoreCreateParams,
  StoreUpdateParams,
} from "@mixedbread/sdk/resources/stores/stores"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { Credentials } from "./Credentials.ts"
import { MixedbreadApiError } from "./Error.ts"

// SDK 0.78.0 predates store tags, but the API accepts and returns them and the
// SDK sends request bodies as given. Drop these once a release includes tags.
export type Tagged<T> = T & { readonly tags?: ReadonlyArray<string> | null }
export type TaggedStore = Tagged<Store>

export interface MixedbreadManagementClient {
  readonly createStore: (
    props: Tagged<StoreCreateParams>,
  ) => Effect.Effect<TaggedStore, MixedbreadApiError>
  readonly copyStore: (
    source: string,
    props: Tagged<StoreCopyParams>,
  ) => Effect.Effect<TaggedStore, MixedbreadApiError>
  readonly retrieveStore: (
    id: string,
  ) => Effect.Effect<TaggedStore, MixedbreadApiError>
  readonly updateStore: (
    id: string,
    props: Tagged<StoreUpdateParams>,
  ) => Effect.Effect<TaggedStore, MixedbreadApiError>
  readonly listStores: (
    query?: string,
  ) => Effect.Effect<ReadonlyArray<TaggedStore>, MixedbreadApiError>
  readonly deleteStore: (id: string) => Effect.Effect<void, MixedbreadApiError>
}

export class MixedbreadClient extends Context.Service<
  MixedbreadClient,
  MixedbreadManagementClient
>()("Mixedbread/Client") {}

export const isNotFound = (error: MixedbreadApiError): boolean =>
  error.cause instanceof NotFoundError

export const isConflict = (error: MixedbreadApiError): boolean =>
  error.cause instanceof ConflictError

const make = Effect.gen(function* () {
  const credentials = yield* Credentials

  const getClient = yield* Effect.cached(
    credentials.pipe(
      Effect.map(
        ({ apiKey, baseUrl }) =>
          new MixedbreadSdk({
            apiKey: Redacted.value(apiKey),
            baseURL: baseUrl,
          }),
      ),
    ),
  )

  const request = <A>(
    operation: string,
    run: (client: MixedbreadSdk, signal: AbortSignal) => Promise<A>,
  ) =>
    getClient.pipe(
      Effect.flatMap((client) =>
        Effect.tryPromise({
          try: (signal) => run(client, signal),
          catch: (cause) => new MixedbreadApiError({ operation, cause }),
        }),
      ),
    )

  return MixedbreadClient.of({
    createStore: (props) =>
      request("createStore", (client, signal) =>
        client.stores.create(props, { signal, maxRetries: 0 }),
      ),
    copyStore: (source, props) =>
      request("copyStore", (client, signal) =>
        client.stores.copy(source, props, { signal, maxRetries: 0 }),
      ),
    retrieveStore: (id) =>
      request("retrieveStore", (client, signal) =>
        client.stores.retrieve(id, { signal }),
      ),
    updateStore: (id, props) =>
      request("updateStore", (client, signal) =>
        client.stores.update(id, props, { signal }),
      ),
    listStores: (query) =>
      request("listStores", async (client, signal) => {
        const stores: Array<TaggedStore> = []
        for await (const store of client.stores.list(
          { limit: 100, ...(query === undefined ? {} : { q: query }) },
          { signal },
        )) {
          stores.push(store)
        }
        return stores
      }),
    deleteStore: (id) =>
      request("deleteStore", (client, signal) =>
        client.stores.delete(id, { signal }),
      ).pipe(Effect.asVoid),
  })
})

export const MixedbreadClientLayer = Layer.effect(MixedbreadClient, make)
