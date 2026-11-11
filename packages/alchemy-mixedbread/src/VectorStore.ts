import type {
  ContextualizationConfig,
  ExpiresAfter,
  StoreConfig,
} from "@mixedbread/sdk/resources/stores/stores"
import { Unowned } from "alchemy/AdoptPolicy"
import { deepEqual, isResolved } from "alchemy/Diff"
import * as Provider from "alchemy/Provider"
import { Resource, type ResourceClassLike } from "alchemy/Resource"
import { Stack } from "alchemy/Stack"
import { Stage } from "alchemy/Stage"
import * as Effect from "effect/Effect"
import {
  isConflict,
  isNotFound,
  MixedbreadClient,
  type TaggedStore as Store,
} from "./Client.ts"
import type { Providers } from "./Providers.ts"

export interface VectorStoreProps {
  readonly name: string
  readonly description?: string
  readonly isPublic?: boolean
  readonly license?: string
  readonly metadata?: Readonly<Record<string, unknown>>
  readonly expiresAfter?: ExpiresAfter
  /**
   * Tags for finding and organizing the store.
   */
  readonly tags?: ReadonlyArray<string>
  readonly config?: {
    readonly contextualization?: boolean | ContextualizationConfig
    readonly save_content?: boolean
  }
}

export type VectorStore = Resource<
  "Mixedbread.VectorStore",
  VectorStoreProps,
  {
    readonly id: string
    readonly name: string
    readonly description: string | null
    readonly metadata: unknown
    readonly config: StoreConfig | null
    readonly expiresAfter: ExpiresAfter | null
    readonly tags: ReadonlyArray<string>
    readonly expiresAt: string | null
    readonly createdAt: string
    readonly updatedAt: string
    readonly status:
      | "expired"
      | "in_progress"
      | "completed"
      | "failed"
      | undefined
  },
  never,
  Providers
>

/**
 * A Mixedbread vector store managed by Alchemy.
 *
 * Store names and configuration are replacement-only. Description, metadata,
 * visibility, license, expiration, and tags are updated in place.
 * @resource
 */
export const VectorStore = Resource<VectorStore>("Mixedbread.VectorStore")

// Alchemy beta.72's declaration emits `Aliases` incompatibly with
// exactOptionalPropertyTypes. Register the same class without that field.
export const VectorStoreRegistration: ResourceClassLike<VectorStore> = {
  Type: VectorStore.Type,
  Props: VectorStore.Props,
  Self: VectorStore.Self,
  Provider: VectorStore.Provider,
}

// Mixedbread trims, lowercases, and deduplicates tags, and may reorder them.
const normalizeTags = (
  tags: ReadonlyArray<string> | null | undefined,
): ReadonlyArray<string> =>
  Array.from(
    new Set((tags ?? []).map((tag) => tag.trim().toLowerCase())),
  ).sort()

interface Ownership {
  readonly stack: string
  readonly stage: string
  readonly resource: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const withOwnership = (
  metadata: Readonly<Record<string, unknown>> | undefined,
  ownership: Ownership,
): Record<string, unknown> => ({
  ...metadata,
  alchemy: ownership,
})

const hasOwnership = (metadata: unknown, ownership: Ownership): boolean => {
  if (!isRecord(metadata) || !isRecord(metadata.alchemy)) {
    return false
  }
  return (
    metadata.alchemy.stack === ownership.stack &&
    metadata.alchemy.stage === ownership.stage &&
    metadata.alchemy.resource === ownership.resource
  )
}

const hasLegacyOwnership = (
  metadata: unknown,
  desired: Readonly<Record<string, unknown>> | undefined,
): boolean => {
  if (
    desired === undefined ||
    Object.keys(desired).length === 0 ||
    !isRecord(metadata) ||
    "alchemy" in metadata
  ) {
    return false
  }
  return Object.entries(desired).every(([key, value]) =>
    deepEqual(metadata[key], value),
  )
}

const toAttributes = (store: Store): VectorStore["Attributes"] => ({
  id: store.id,
  name: store.name,
  description: store.description ?? null,
  metadata: store.metadata,
  config: store.config ?? null,
  expiresAfter: store.expires_after ?? null,
  tags: store.tags ?? [],
  expiresAt: store.expires_at ?? null,
  createdAt: store.created_at,
  updatedAt: store.updated_at,
  status: store.status,
})

const exactStoreByName = Effect.fn("Mixedbread.exactStoreByName")(function* (
  name: string,
) {
  const client = yield* MixedbreadClient
  const matches = (yield* client.listStores(name)).filter(
    (store) => store.name === name,
  )
  if (matches.length > 1) {
    return yield* Effect.fail(
      new Error(
        `Multiple Mixedbread stores are named '${name}'; use a unique store name before managing it with Alchemy.`,
      ),
    )
  }
  return matches[0]
})

export const VectorStoreProvider = Provider.effect(
  VectorStoreRegistration,
  Effect.gen(function* () {
    const client = yield* MixedbreadClient

    const retrieveOptional = (id: string) =>
      client
        .retrieveStore(id)
        .pipe(Effect.catchIf(isNotFound, () => Effect.succeed(undefined)))

    const deleteOptional = (id: string) =>
      client.deleteStore(id).pipe(Effect.catchIf(isNotFound, () => Effect.void))

    // Resolves a found store to one that can be updated in place, or to
    // `undefined` when it has to be created again.
    const settle = Effect.fn("Mixedbread.settle")(function* (
      store: Store | undefined,
      ownership: Ownership,
    ) {
      if (store?.status === "expired") {
        yield* deleteOptional(store.id)
        return undefined
      }
      if (store?.status === "failed") {
        if (!hasOwnership(store.metadata, ownership)) {
          return yield* Effect.fail(
            new Error(
              `Mixedbread store '${store.name}' failed and is not owned by this Alchemy resource.`,
            ),
          )
        }
        // A failed store can only be deleted.
        yield* deleteOptional(store.id)
        return undefined
      }
      return store
    })

    return {
      stables: ["id", "name"],
      list: () =>
        client
          .listStores()
          .pipe(Effect.map((stores) => stores.map(toAttributes))),
      diff: Effect.fn(function* ({ olds, news, output }) {
        if (!isResolved(news)) return undefined
        if (
          output !== undefined &&
          (news.name !== output.name || !deepEqual(news.config, olds.config))
        ) {
          return {
            action: "replace",
            deleteFirst: news.name === output.name,
          } as const
        }
        // Neither unchanged inputs nor a recorded id prove the store still
        // exists: preview stores carry an `expiresAfter` and delete themselves,
        // so a stage that sat idle past the TTL still holds a live-looking id.
        // `reconcile` recreates a missing store, but the replacement gets a NEW
        // id, so the provider-level `stables` above would be a lie here —
        // alchemy resolves stable attributes straight from previous state and
        // would hand dependents the dead id before `reconcile` ever runs.
        // An empty `stables` overrides it and makes them wait for the real
        // output. This check has to precede the input comparison, so it still
        // applies when the props changed too.
        if (output !== undefined) {
          const store = yield* client
            .retrieveStore(output.id)
            .pipe(Effect.catchIf(isNotFound, () => Effect.succeed(undefined)))
          if (
            store === undefined ||
            store.status === "expired" ||
            store.status === "failed"
          ) {
            return { action: "update", stables: [] } as const
          }
        }

        return deepEqual(olds, news)
          ? { action: "noop" as const }
          : { action: "update" as const }
      }),
      read: Effect.fn(function* ({ id, olds, output }) {
        const stack = yield* Stack
        const stage = yield* Stage
        const ownership = { stack: stack.name, stage, resource: id }
        const store = output
          ? yield* client
              .retrieveStore(output.id)
              .pipe(Effect.catchIf(isNotFound, () => Effect.succeed(undefined)))
          : yield* exactStoreByName(olds.name)
        if (
          store === undefined ||
          store.status === "expired" ||
          store.status === "failed"
        ) {
          return undefined
        }
        const attributes = toAttributes(store)
        return hasOwnership(store.metadata, ownership) ||
          hasLegacyOwnership(store.metadata, olds.metadata)
          ? attributes
          : Unowned(attributes)
      }),
      reconcile: Effect.fn(function* ({ id, news, output }) {
        const stack = yield* Stack
        const stage = yield* Stage
        const ownership = { stack: stack.name, stage, resource: id }
        const metadata = withOwnership(news.metadata, ownership)
        let store = yield* settle(
          output
            ? yield* retrieveOptional(output.id)
            : yield* exactStoreByName(news.name),
          ownership,
        )

        if (store === undefined) {
          const create = client.createStore({
            name: news.name,
            ...(news.description === undefined
              ? {}
              : { description: news.description }),
            ...(news.isPublic === undefined
              ? {}
              : { is_public: news.isPublic }),
            ...(news.license === undefined ? {} : { license: news.license }),
            metadata,
            ...(news.expiresAfter === undefined
              ? {}
              : { expires_after: news.expiresAfter }),
            ...(news.tags === undefined ? {} : { tags: news.tags }),
            ...(news.config === undefined ? {} : { config: news.config }),
          })
          store = yield* create.pipe(
            Effect.catchIf(isConflict, () =>
              exactStoreByName(news.name).pipe(
                Effect.flatMap((existing) =>
                  existing !== undefined &&
                  hasOwnership(existing.metadata, ownership)
                    ? // A creation whose response never arrived still owns the
                      // name; settle it, then create again if it failed.
                      settle(existing, ownership).pipe(
                        Effect.flatMap((settled) =>
                          settled === undefined
                            ? create
                            : Effect.succeed(settled),
                        ),
                      )
                    : Effect.fail(
                        new Error(
                          `Mixedbread store '${news.name}' appeared during creation but is not owned by this Alchemy resource.`,
                        ),
                      ),
                ),
              ),
            ),
          )
        }

        // Stores created before tags were managed have none.
        const desired = {
          description: news.description ?? null,
          isPublic: news.isPublic,
          license: news.license ?? null,
          metadata,
          expiresAfter: news.expiresAfter ?? null,
          tags: normalizeTags(news.tags),
        }
        const current = {
          description: store.description ?? null,
          isPublic: store.is_public,
          license: store.license ?? null,
          metadata: store.metadata,
          expiresAfter: store.expires_after ?? null,
          tags: normalizeTags(store.tags),
        }
        if (!deepEqual(current, desired)) {
          store = yield* client.updateStore(store.id, {
            description: news.description ?? null,
            is_public: news.isPublic ?? null,
            license: news.license ?? null,
            metadata,
            expires_after: news.expiresAfter ?? null,
            tags: news.tags ?? [],
          })
        }
        return toAttributes(store)
      }),
      delete: Effect.fn(function* ({ output }) {
        yield* deleteOptional(output.id)
      }),
    }
  }),
)
