import { NotFoundError } from "@mixedbread/sdk"
import type { Store } from "@mixedbread/sdk/resources/stores/stores"
import { Unowned } from "alchemy/AdoptPolicy"
import type { ScopedPlanStatusSession } from "alchemy/Report"
import type { Provider } from "alchemy/Provider"
import { Stack } from "alchemy/Stack"
import { Stage } from "alchemy/Stage"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import { TestClock } from "effect/testing"
import { assert, test } from "vite-plus/test"
import {
  MixedbreadClient,
  type MixedbreadManagementClient,
} from "../src/Client.ts"
import { MixedbreadApiError } from "../src/Error.ts"
import {
  VectorStore,
  VectorStoreProvider,
  type VectorStoreProps,
} from "../src/VectorStore.ts"

const makeStore = (id: string, name: string, metadata?: unknown): Store => ({
  id,
  name,
  metadata,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
})

const notFound = (operation: string) =>
  new MixedbreadApiError({
    operation,
    cause: new NotFoundError(404, {}, undefined, new Headers()),
  })

const makeClient = (
  options: { readonly copyOutcome?: "completed" | "failed" } = {},
) => {
  const stores = new Map<string, Store>()
  // Copies in progress, with the retrieves left before each one settles.
  const copying = new Map<string, { retrieves: number; settled: Store }>()
  let creates = 0
  let copies = 0
  const client: MixedbreadManagementClient = {
    // Copies report `in_progress` and settle on the next retrieve.
    copyStore: (source, props) =>
      Effect.gen(function* () {
        const origin = stores.get(source)
        if (origin === undefined) {
          return yield* Effect.fail(notFound("copy store"))
        }
        copies += 1
        const copy: Store = {
          ...origin,
          id: `copy-${copies}`,
          name: props.name,
          metadata: props.metadata ?? origin.metadata,
          status: "in_progress",
          copy_state: {
            role: "target",
            status: "in_progress",
            peer_store_id: origin.id,
            started_at: "2026-01-01T00:00:00.000Z",
          },
        }
        const failed = options.copyOutcome === "failed"
        stores.set(copy.id, copy)
        copying.set(copy.id, {
          retrieves: 1,
          settled: {
            ...copy,
            status: failed ? "failed" : "completed",
            copy_state: failed
              ? {
                  role: "target",
                  status: "failed",
                  peer_store_id: origin.id,
                  started_at: "2026-01-01T00:00:00.000Z",
                  error: "copy failed",
                }
              : null,
          },
        })
        return copy
      }),
    createStore: (props) =>
      Effect.sync(() => {
        creates += 1
        const store = makeStore(
          `store-${creates}`,
          props.name ?? `store-${creates}`,
          props.metadata,
        )
        stores.set(store.id, store)
        return store
      }),
    retrieveStore: (id) => {
      const pending = copying.get(id)
      if (pending !== undefined && stores.has(id)) {
        if (pending.retrieves === 0) {
          stores.set(id, pending.settled)
          copying.delete(id)
        } else {
          pending.retrieves -= 1
        }
      }
      const store = stores.get(id)
      return store === undefined
        ? Effect.fail(notFound("retrieve store"))
        : Effect.succeed(store)
    },
    updateStore: (id, props) =>
      Effect.gen(function* () {
        const store = stores.get(id)
        if (store === undefined) {
          return yield* Effect.fail(notFound("update store"))
        }
        const updated: Store = {
          ...store,
          ...(props.description === undefined
            ? {}
            : { description: props.description }),
          ...(props.is_public == null ? {} : { is_public: props.is_public }),
          ...(props.license === undefined ? {} : { license: props.license }),
          ...(props.metadata === undefined ? {} : { metadata: props.metadata }),
          ...(props.expires_after === undefined
            ? {}
            : { expires_after: props.expires_after }),
          updated_at: "2026-01-02T00:00:00.000Z",
        }
        stores.set(id, updated)
        return updated
      }),
    listStores: (query) =>
      Effect.succeed(
        Array.from(stores.values()).filter(
          (store) => query === undefined || store.name.includes(query),
        ),
      ),
    deleteStore: (id) =>
      stores.delete(id) ? Effect.void : Effect.fail(notFound("delete store")),
  }
  return {
    client,
    copies: () => copies,
    creates: () => creates,
    stores,
    // Keeps a copy in progress for this many more retrieves.
    holdCopy: (id: string, retrieves: number) => {
      const pending = copying.get(id)
      if (pending !== undefined) pending.retrieves = retrieves
    },
  }
}

const session: ScopedPlanStatusSession = {
  emit: () => Effect.void,
  done: () => Effect.void,
  note: () => Effect.void,
}

const props: VectorStoreProps = {
  name: "effect-website-pr-123",
  metadata: {
    lifecycle: "pull-request-preview",
    pullRequest: 123,
    repository: "Effect-TS/website",
  },
}

const withProvider = <A>(
  client: MixedbreadManagementClient,
  effect: Effect.Effect<A, unknown, Provider<VectorStore> | Stack | Stage>,
) =>
  effect.pipe(
    Effect.provide(
      VectorStoreProvider.pipe(
        Layer.provideMerge(Layer.succeed(MixedbreadClient, client)),
      ),
    ),
    Effect.provideService(Stack, {
      name: "EffectWebsite",
      stage: "pr-123",
      resources: {},
      bindings: {},
      actions: {},
    }),
    Effect.provideService(Stage, "pr-123"),
  )

test("creates once, recovers from state, and deletes idempotently", async () => {
  const fake = makeClient()
  await Effect.runPromise(
    withProvider(
      fake.client,
      Effect.gen(function* () {
        const provider = yield* VectorStore.Provider
        const first = yield* provider.reconcile({
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          news: props,
          olds: undefined,
          output: undefined,
          session,
          bindings: [],
        })
        const second = yield* provider.reconcile({
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          news: props,
          olds: props,
          output: first,
          session,
          bindings: [],
        })

        assert.equal(first.id, second.id)
        assert.equal(fake.creates(), 1)
        assert.deepEqual(first.metadata, {
          ...props.metadata,
          alchemy: {
            stack: "EffectWebsite",
            stage: "pr-123",
            resource: "PreviewSearchStore",
          },
        })

        yield* provider.delete({
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          olds: props,
          output: second,
          session,
          bindings: [],
        })
        yield* provider.delete({
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          olds: props,
          output: second,
          session,
          bindings: [],
        })
      }),
    ),
  )
})

test("marks a same-name foreign store as unowned", async () => {
  const fake = makeClient()
  fake.stores.set(
    "foreign",
    makeStore("foreign", props.name, { owner: "other" }),
  )

  await Effect.runPromise(
    withProvider(
      fake.client,
      Effect.gen(function* () {
        const provider = yield* VectorStore.Provider
        if (provider.read === undefined) {
          return yield* Effect.die("VectorStore provider must implement read")
        }
        const result = yield* provider.read({
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          olds: props,
          output: undefined,
        })
        assert.equal(Unowned.is(result), true)
      }),
    ),
  )
})

test("recovers a legacy preview store with matching metadata", async () => {
  const fake = makeClient()
  fake.stores.set(
    "legacy",
    makeStore("legacy", props.name, {
      ...props.metadata,
      revision: "previous-revision",
    }),
  )

  await Effect.runPromise(
    withProvider(
      fake.client,
      Effect.gen(function* () {
        const provider = yield* VectorStore.Provider
        if (provider.read === undefined) {
          return yield* Effect.die("VectorStore provider must implement read")
        }
        const result = yield* provider.read({
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          olds: props,
          output: undefined,
        })
        assert.equal(Unowned.is(result), false)
        assert.equal(result?.id, "legacy")
      }),
    ),
  )
})

test("recreates a preview store that expired while the inputs stayed the same", async () => {
  const fake = makeClient()
  await Effect.runPromise(
    withProvider(
      fake.client,
      Effect.gen(function* () {
        const provider = yield* VectorStore.Provider
        const created = yield* provider.reconcile({
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          news: props,
          olds: undefined,
          output: undefined,
          session,
          bindings: [],
        })

        const unchanged = {
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          olds: props,
          news: props,
          oldBindings: [],
          newBindings: [],
          output: created,
        }

        assert.deepEqual(yield* provider.diff!(unchanged), { action: "noop" })

        // The store's `expiresAfter` deletes it out from under us; state still
        // holds its id, so an input-only diff would noop and leave a later sync
        // to 404 on a store that no longer exists.
        fake.stores.delete(created.id)

        // `stables` must be empty: the recreated store gets a new id, and
        // alchemy resolves declared-stable attributes from previous state
        // without waiting for reconcile, so a non-empty list here hands
        // dependents the dead id.
        assert.deepEqual(yield* provider.diff!(unchanged), {
          action: "update",
          stables: [],
        })

        // Same when the props changed too — the existence check must not sit
        // behind the input comparison.
        assert.deepEqual(
          yield* provider.diff!({
            ...unchanged,
            news: { ...props, description: "changed" },
          }),
          { action: "update", stables: [] },
        )

        const recreated = yield* provider.reconcile({
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          news: props,
          olds: props,
          output: created,
          session,
          bindings: [],
        })

        assert.notEqual(recreated.id, created.id)
        assert.equal(fake.creates(), 2)
      }),
    ),
  )
})

test("recreates a preview store returned with expired status", async () => {
  const fake = makeClient()
  await Effect.runPromise(
    withProvider(
      fake.client,
      Effect.gen(function* () {
        const provider = yield* VectorStore.Provider
        const created = yield* provider.reconcile({
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          news: props,
          olds: undefined,
          output: undefined,
          session,
          bindings: [],
        })
        const expired = fake.stores.get(created.id)
        assert.ok(expired)
        fake.stores.set(created.id, {
          ...expired,
          status: "expired",
        })

        const read = provider.read
        assert.ok(read)
        assert.equal(
          yield* read({
            id: "PreviewSearchStore",
            fqn: "PreviewSearchStore",
            instanceId: "instance-1",
            olds: props,
            output: created,
          }),
          undefined,
        )

        const unchanged = {
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          olds: props,
          news: props,
          oldBindings: [],
          newBindings: [],
          output: created,
        }
        const diff = provider.diff
        assert.ok(diff)
        assert.deepEqual(yield* diff(unchanged), {
          action: "update",
          stables: [],
        })

        const recreated = yield* provider.reconcile({
          id: "PreviewSearchStore",
          fqn: "PreviewSearchStore",
          instanceId: "instance-1",
          news: props,
          olds: props,
          output: created,
          session,
          bindings: [],
        })
        assert.notEqual(recreated.id, created.id)
        assert.equal(recreated.status, undefined)
        assert.equal(fake.creates(), 2)
        assert.equal(fake.stores.has(created.id), false)
      }),
    ),
  )
})

const production: Store = {
  ...makeStore("production", "effect-website"),
  config: { contextualization: true },
  expires_after: null,
  file_counts: { completed: 10, pending: 0, in_progress: 0 },
}

const copyProps: VectorStoreProps = {
  ...props,
  expiresAfter: { anchor: "last_active_at", days: 7 },
  config: { contextualization: true },
  copyFrom: "production",
}

const reconcileArgs = (
  news: VectorStoreProps,
  output?: VectorStore["Attributes"],
) => ({
  id: "PreviewSearchStore",
  fqn: "PreviewSearchStore",
  instanceId: "instance-1",
  news,
  olds: output === undefined ? undefined : news,
  output,
  session,
  bindings: [],
})

// Copies are polled on the clock, so run against a test clock and advance it
// until the reconcile finishes.
const withTestClock = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(effect)
    yield* TestClock.adjust("1 minute")
    return yield* Fiber.join(fiber)
  }).pipe(Effect.provide(TestClock.layer()))

test("copies the source store and applies the preview settings", async () => {
  const fake = makeClient()
  fake.stores.set(production.id, production)

  await Effect.runPromise(
    withProvider(
      fake.client,
      withTestClock(
        Effect.gen(function* () {
          const provider = yield* VectorStore.Provider
          const copied = yield* provider.reconcile(reconcileArgs(copyProps))

          assert.equal(fake.copies(), 1)
          assert.equal(fake.creates(), 0)
          assert.equal(copied.status, "completed")
          assert.deepEqual(copied.expiresAfter, copyProps.expiresAfter)
          assert.deepEqual(copied.metadata, {
            ...props.metadata,
            alchemy: {
              stack: "EffectWebsite",
              stage: "pr-123",
              resource: "PreviewSearchStore",
            },
          })

          // Later runs reuse the preview store instead of copying again.
          const reused = yield* provider.reconcile(
            reconcileArgs(copyProps, copied),
          )
          assert.equal(reused.id, copied.id)
          assert.equal(fake.copies(), 1)
          assert.equal(fake.stores.get(production.id), production)
        }),
      ),
    ),
  )
})

test("creates an empty store when the source configuration differs", async () => {
  const fake = makeClient()
  fake.stores.set(production.id, {
    ...production,
    config: { contextualization: false },
  })

  await Effect.runPromise(
    withProvider(
      fake.client,
      Effect.gen(function* () {
        const provider = yield* VectorStore.Provider
        yield* provider.reconcile(reconcileArgs(copyProps))
        assert.equal(fake.copies(), 0)
        assert.equal(fake.creates(), 1)
      }),
    ),
  )
})

test("creates an empty store when the source is still processing files", async () => {
  const fake = makeClient()
  fake.stores.set(production.id, {
    ...production,
    file_counts: { completed: 9, pending: 1 },
  })

  await Effect.runPromise(
    withProvider(
      fake.client,
      Effect.gen(function* () {
        const provider = yield* VectorStore.Provider
        yield* provider.reconcile(reconcileArgs(copyProps))
        assert.equal(fake.copies(), 0)
        assert.equal(fake.creates(), 1)
      }),
    ),
  )
})

test("creates an empty store when the source cannot be copied", async () => {
  const fake = makeClient()

  await Effect.runPromise(
    withProvider(
      fake.client,
      Effect.gen(function* () {
        const provider = yield* VectorStore.Provider
        yield* provider.reconcile(reconcileArgs(copyProps))
        assert.equal(fake.creates(), 1)
      }),
    ),
  )
})

test("deletes a failed copy and creates an empty store", async () => {
  const fake = makeClient({ copyOutcome: "failed" })
  fake.stores.set(production.id, production)

  await Effect.runPromise(
    withProvider(
      fake.client,
      withTestClock(
        Effect.gen(function* () {
          const provider = yield* VectorStore.Provider
          const created = yield* provider.reconcile(reconcileArgs(copyProps))
          assert.equal(fake.copies(), 1)
          assert.equal(fake.creates(), 1)
          assert.equal(created.id, "store-1")
          assert.equal(fake.stores.has("copy-1"), false)
        }),
      ),
    ),
  )
})

test("waits for a copy left running by a cancelled workflow", async () => {
  const fake = makeClient()
  fake.stores.set(production.id, production)
  const ownedMetadata = {
    ...props.metadata,
    alchemy: {
      stack: "EffectWebsite",
      stage: "pr-123",
      resource: "PreviewSearchStore",
    },
  }

  await Effect.runPromise(
    withProvider(
      fake.client,
      withTestClock(
        Effect.gen(function* () {
          const provider = yield* VectorStore.Provider
          // What a run cancelled after starting the copy leaves behind.
          const inProgress = yield* fake.client.copyStore(production.id, {
            name: copyProps.name,
            metadata: ownedMetadata,
          })
          const output: VectorStore["Attributes"] = {
            id: inProgress.id,
            name: inProgress.name,
            description: null,
            metadata: ownedMetadata,
            config: null,
            expiresAfter: null,
            expiresAt: null,
            createdAt: inProgress.created_at,
            updatedAt: inProgress.updated_at,
            status: "in_progress",
          }

          fake.holdCopy(inProgress.id, 3)
          assert.deepEqual(
            yield* provider.diff!({
              id: "PreviewSearchStore",
              fqn: "PreviewSearchStore",
              instanceId: "instance-1",
              olds: copyProps,
              news: copyProps,
              oldBindings: [],
              newBindings: [],
              output,
            }),
            { action: "update", stables: [] },
          )

          const resumed = yield* provider.reconcile(
            reconcileArgs(copyProps, output),
          )
          assert.equal(resumed.id, inProgress.id)
          assert.equal(resumed.status, "completed")
          assert.deepEqual(resumed.expiresAfter, copyProps.expiresAfter)
          assert.equal(fake.copies(), 1)
          assert.equal(fake.creates(), 0)
        }),
      ),
    ),
  )
})

test("does not update or replace a store when only the copy source changes", async () => {
  const fake = makeClient()
  await Effect.runPromise(
    withProvider(
      fake.client,
      Effect.gen(function* () {
        const provider = yield* VectorStore.Provider
        const created = yield* provider.reconcile(reconcileArgs(props))
        assert.deepEqual(
          yield* provider.diff!({
            id: "PreviewSearchStore",
            fqn: "PreviewSearchStore",
            instanceId: "instance-1",
            olds: props,
            news: { ...props, copyFrom: "production" },
            oldBindings: [],
            newBindings: [],
            output: created,
          }),
          { action: "noop" },
        )
      }),
    ),
  )
})
