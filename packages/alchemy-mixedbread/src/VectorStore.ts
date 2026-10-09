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
import * as Redacted from "effect/Redacted"
import * as Schedule from "effect/Schedule"
import {
  isConflict,
  isGone,
  isPermissionDenied,
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
   * Tags for finding and organizing the store. They replace the store's
   * current tags, including any a copy inherits from its source.
   */
  readonly tags?: ReadonlyArray<string>
  readonly config?: {
    readonly contextualization?: boolean | ContextualizationConfig
    readonly save_content?: boolean
  }
  /**
   * ID or name of a store to copy when this resource creates the store.
   *
   * The copy keeps the source's files and indexed chunks, so it is only used
   * when the source's configuration matches `config`. Any copy failure falls
   * back to creating an empty store. Changing this prop never replaces an
   * existing store.
   */
  readonly copyFrom?: string | Redacted.Redacted<string>
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

// Only consulted when creating a store, so it never forces an update or a
// replacement of one that already exists.
const withoutCopySource = ({
  copyFrom: _,
  ...props
}: VectorStoreProps): Omit<VectorStoreProps, "copyFrom"> => props

// A copy target reports `in_progress` until the copy finishes; neither store
// accepts file changes before then.
const isCopying = (store: Store): boolean =>
  store.copy_state?.role === "target" && store.status === "in_progress"

const COPY_POLL_INTERVAL = "2 seconds"
const COPY_TIMEOUT = "20 minutes"

// The settings the copy carries over and that `createStore` would otherwise
// set from `config`. Mixedbread applies `save_content: true` and no
// contextualization by default.
const effectiveConfig = (
  config: VectorStoreProps["config"] | StoreConfig | null | undefined,
) => ({
  contextualization: config?.contextualization ?? false,
  save_content: config?.save_content ?? true,
  lsf: (config as StoreConfig | null | undefined)?.lsf ?? null,
})

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
        .pipe(Effect.catchIf(isGone, () => Effect.succeed(undefined)))

    const deleteOptional = (id: string) =>
      client.deleteStore(id).pipe(Effect.catchIf(isGone, () => Effect.void))

    // A workflow cancelled mid-copy leaves the target copying; wait for it
    // rather than writing to a store that rejects file changes.
    const awaitCopy = Effect.fn("Mixedbread.awaitCopy")(function* (
      store: Store,
    ) {
      let current: Store | undefined = store
      while (current !== undefined && isCopying(current)) {
        yield* Effect.sleep(COPY_POLL_INTERVAL)
        current = yield* retrieveOptional(current.id)
      }
      return current
    }, Effect.timeout(COPY_TIMEOUT))

    // Deleting a store does not always free its name immediately; wait for
    // the name to become available before recreating under it instead of
    // crashing into a second 409.
    const NAME_POLL_INTERVAL = "2 seconds"
    const NAME_POLL_ATTEMPTS = 60

    const waitForNameFree = Effect.fn("Mixedbread.waitForNameFree")(function* (
      name: string,
    ) {
      const existing = yield* exactStoreByName(name).pipe(
        Effect.repeat({
          schedule: Schedule.recurs(NAME_POLL_ATTEMPTS).pipe(
            Schedule.addDelay(() => Effect.succeed(NAME_POLL_INTERVAL)),
          ),
          until: (store) => store === undefined,
        }),
      )
      if (existing !== undefined) {
        return yield* Effect.fail(
          new Error(
            `Mixedbread store name '${name}' is still reserved after deleting the conflicting store; it may be an expired record Mixedbread has not purged.`,
          ),
        )
      }
    })

    // Resolves a found store to one that can be updated in place, or to
    // `undefined` when it has to be created again.
    const settle = Effect.fn("Mixedbread.settle")(function* (
      store: Store | undefined,
      ownership: Ownership,
    ) {
      const current = store === undefined ? undefined : yield* awaitCopy(store)
      if (current?.status === "expired") {
        yield* deleteOptional(current.id)
        return undefined
      }
      if (current?.status === "failed") {
        if (!hasOwnership(current.metadata, ownership)) {
          return yield* Effect.fail(
            new Error(
              `Mixedbread store '${current.name}' is a failed copy that is not owned by this Alchemy resource.`,
            ),
          )
        }
        // A failed copy can only be deleted.
        yield* deleteOptional(current.id)
        return undefined
      }
      return current
    })

    // Resolves a 409 on the store name. A store this resource owns is one an
    // earlier run created but never saved to state, e.g. a copy whose
    // response never arrived or whose follow-up update failed; settle and
    // reuse it. When settling deletes it, wait for the name to free up so
    // the caller can create it again.
    const claimByName = Effect.fn("Mixedbread.claimByName")(function* (
      name: string,
      ownership: Ownership,
    ) {
      const existing = yield* exactStoreByName(name)
      if (
        existing === undefined ||
        !hasOwnership(existing.metadata, ownership)
      ) {
        return yield* Effect.fail(
          new Error(
            `Mixedbread store '${name}' appeared during creation but is not owned by this Alchemy resource.`,
          ),
        )
      }
      const settled = yield* settle(existing, ownership)
      if (settled === undefined) {
        yield* waitForNameFree(name)
      }
      return settled
    })

    // Copying only saves indexing work, so anything that makes it unsafe or
    // unsuccessful falls back to an empty store. The caller's full sync
    // reconciles the copy with its own content either way.
    const copyStore = Effect.fn("Mixedbread.copyStore")(
      function* (
        source: string,
        news: VectorStoreProps,
        metadata: Record<string, unknown>,
        ownership: Ownership,
      ) {
        const origin = yield* client.retrieveStore(source)
        if (
          !deepEqual(
            effectiveConfig(origin.config),
            effectiveConfig(news.config),
          )
        ) {
          yield* Effect.logWarning(
            `Not copying Mixedbread store '${origin.name}': its configuration differs from '${news.name}'`,
          )
          return undefined
        }
        const counts = origin.file_counts
        if (
          (counts?.pending ?? 0) > 0 ||
          (counts?.in_progress ?? 0) > 0 ||
          origin.copy_state?.status === "in_progress"
        ) {
          yield* Effect.logWarning(
            `Not copying Mixedbread store '${origin.name}': it is still processing files or being copied`,
          )
          return undefined
        }
        const copyArgs = {
          name: news.name,
          ...(news.description === undefined
            ? {}
            : { description: news.description }),
          metadata,
          // Without this the copy would carry the source's tags.
          tags: news.tags ?? [],
        }
        const { tags: _dropped, ...copyArgsWithoutTags } = copyArgs
        const copy = yield* client.copyStore(origin.id, copyArgs).pipe(
          // Scope-restricted keys cannot set tags on copy; retry inheriting
          // the source's tags instead of falling back to an empty store.
          // Reconcile enforces the desired tags afterwards.
          Effect.catchIf(isPermissionDenied, () =>
            Effect.logWarning(
              `Copying Mixedbread store '${origin.name}' without tags: the API key cannot change tags on copy`,
            ).pipe(
              Effect.flatMap(() =>
                client.copyStore(origin.id, copyArgsWithoutTags),
              ),
            ),
          ),
          Effect.catchIf(isConflict, () => Effect.succeed(undefined)),
        )
        if (copy === undefined) {
          yield* Effect.log(
            `Mixedbread store '${news.name}' already exists; reusing it instead of copying`,
          )
          return yield* claimByName(news.name, ownership)
        }
        yield* Effect.log(
          `Copying Mixedbread store '${origin.name}' into '${news.name}'`,
        )
        const copied = yield* awaitCopy(copy)
        if (copied?.status === "failed") {
          yield* Effect.logWarning(
            `Copy into Mixedbread store '${news.name}' failed: ${copied.copy_state?.error ?? "unknown error"}`,
          )
          yield* deleteOptional(copied.id)
          return undefined
        }
        return copied
      },
      Effect.catchTag("MixedbreadApiError", (error) =>
        Effect.logWarning(
          `Falling back to an empty Mixedbread store: ${error.message}`,
          error.cause,
        ).pipe(Effect.as(undefined)),
      ),
    )

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
            .pipe(Effect.catchIf(isGone, () => Effect.succeed(undefined)))
          // A copy in progress can still fail and be recreated with a new id.
          if (
            store === undefined ||
            store.status === "expired" ||
            store.status === "failed" ||
            isCopying(store)
          ) {
            return { action: "update", stables: [] } as const
          }
        }

        return deepEqual(withoutCopySource(olds), withoutCopySource(news))
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
              .pipe(Effect.catchIf(isGone, () => Effect.succeed(undefined)))
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
        const fromState =
          output === undefined ? undefined : yield* retrieveOptional(output.id)
        // When the store in state is gone, a run whose result never reached
        // state may still have left this resource's store under the name.
        const byName =
          fromState === undefined
            ? yield* exactStoreByName(news.name)
            : undefined
        let store = yield* settle(
          fromState ??
            (output === undefined || hasOwnership(byName?.metadata, ownership)
              ? byName
              : undefined),
          ownership,
        )

        if (store === undefined && news.copyFrom !== undefined) {
          store = yield* copyStore(
            Redacted.isRedacted(news.copyFrom)
              ? Redacted.value(news.copyFrom)
              : news.copyFrom,
            news,
            metadata,
            ownership,
          )
        }

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
              claimByName(news.name, ownership).pipe(
                Effect.flatMap((settled) =>
                  settled === undefined
                    ? create.pipe(
                        Effect.catchIf(isConflict, () =>
                          Effect.fail(
                            new Error(
                              `Mixedbread store name '${news.name}' is still reserved after deleting the conflicting store; it may be an expired record Mixedbread has not purged.`,
                            ),
                          ),
                        ),
                      )
                    : Effect.succeed(settled),
                ),
              ),
            ),
          )
        }

        // A copy keeps the source's visibility, license, and expiration, and
        // stores created before tags were managed have none.
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
          const storeId = store.id
          const storeName = store.name
          const fullUpdate = {
            description: news.description ?? null,
            is_public: news.isPublic ?? null,
            license: news.license ?? null,
            metadata,
            expires_after: news.expiresAfter ?? null,
            tags: news.tags ?? [],
          }
          const { tags: _droppedTags, ...updateWithoutTags } = fullUpdate
          store = yield* client.updateStore(storeId, fullUpdate).pipe(
            // The key may be allowed to write fields but not tags; retry
            // without them instead of failing the deploy. Tags left behind
            // are reported, not hidden.
            Effect.catchIf(isPermissionDenied, () =>
              Effect.logWarning(
                `Updating Mixedbread store '${storeName}' without tags: the API key cannot change tags`,
              ).pipe(
                Effect.flatMap(() =>
                  client.updateStore(storeId, updateWithoutTags),
                ),
                Effect.catchIf(isPermissionDenied, () =>
                  Effect.fail(
                    new Error(
                      `Cannot update Mixedbread store '${storeName}': the API key is missing the write scope for it. Widen the preview key scope or manage the store with a less restricted key.`,
                    ),
                  ),
                ),
              ),
            ),
          )
        }
        return toAttributes(store)
      }),
      delete: Effect.fn(function* ({ output }) {
        yield* client
          .deleteStore(output.id)
          .pipe(Effect.catchIf(isGone, () => Effect.void))
      }),
    }
  }),
)
