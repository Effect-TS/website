import { NotFoundError } from "@mixedbread/sdk"
import type { Store } from "@mixedbread/sdk/resources/stores/stores"
import { Unowned } from "alchemy/AdoptPolicy"
import type { ScopedPlanStatusSession } from "alchemy/Cli/Cli"
import type { Provider } from "alchemy/Provider"
import { Stack } from "alchemy/Stack"
import { Stage } from "alchemy/Stage"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
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

const makeClient = () => {
  const stores = new Map<string, Store>()
  let creates = 0
  const client: MixedbreadManagementClient = {
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
  return { client, creates: () => creates, stores }
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
