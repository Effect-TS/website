import type {
  ContextualizationConfig,
  ExpiresAfter,
  Store,
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
import { isConflict, isNotFound, MixedbreadClient } from "./Client.ts"
import type { Providers } from "./Providers.ts"

export interface VectorStoreProps {
  readonly name: string
  readonly description?: string
  readonly isPublic?: boolean
  readonly license?: string
  readonly metadata?: Readonly<Record<string, unknown>>
  readonly expiresAfter?: ExpiresAfter
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
 * visibility, license, and expiration are updated in place.
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

    // Copying only saves indexing work, so anything that makes it unsafe or
    // unsuccessful falls back to an empty store. The caller's full sync
    // reconciles the copy with its own content either way.
    const copyStore = Effect.fn("Mixedbread.copyStore")(
      function* (
        source: string,
        news: VectorStoreProps,
        metadata: Record<string, unknown>,
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
        const copy = yield* client.copyStore(origin.id, {
          name: news.name,
          ...(news.description === undefined
            ? {}
            : { description: news.description }),
          metadata,
        })
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
            .pipe(Effect.catchIf(isNotFound, () => Effect.succeed(undefined)))
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

        if (store === undefined && news.copyFrom !== undefined) {
          store = yield* copyStore(
            Redacted.isRedacted(news.copyFrom)
              ? Redacted.value(news.copyFrom)
              : news.copyFrom,
            news,
            metadata,
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
            ...(news.config === undefined ? {} : { config: news.config }),
          })
          store = yield* create.pipe(
            Effect.catchIf(isConflict, () =>
              exactStoreByName(news.name).pipe(
                Effect.flatMap((existing) =>
                  existing !== undefined &&
                  hasOwnership(existing.metadata, ownership)
                    ? // A copy whose response never arrived still owns the
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

        // A copy keeps the source's visibility, license, and expiration.
        const desired = {
          description: news.description ?? null,
          isPublic: news.isPublic,
          license: news.license ?? null,
          metadata,
          expiresAfter: news.expiresAfter ?? null,
        }
        const current = {
          description: store.description ?? null,
          isPublic: store.is_public,
          license: store.license ?? null,
          metadata: store.metadata,
          expiresAfter: store.expires_after ?? null,
        }
        if (!deepEqual(current, desired)) {
          store = yield* client.updateStore(store.id, {
            description: news.description ?? null,
            is_public: news.isPublic ?? null,
            license: news.license ?? null,
            metadata,
            expires_after: news.expiresAfter ?? null,
          })
        }
        return toAttributes(store)
      }),
      delete: Effect.fn(function* ({ output }) {
        yield* client
          .deleteStore(output.id)
          .pipe(Effect.catchIf(isNotFound, () => Effect.void))
      }),
    }
  }),
)
