import type MixedbreadClient from "@mixedbread/sdk"
import * as Effect from "effect/Effect"
import { assert, test } from "vite-plus/test"
import { makeStoreClient } from "../src/Store.ts"

const store = (metadata: unknown) =>
  ({
    id: "store-1",
    name: "effect-website-pr-1",
    metadata,
  }) as MixedbreadClient.Store

const makeClient = () => {
  const updates: Array<unknown> = []
  const client = {
    stores: {
      update: async (_id: string, body: { metadata: unknown }) => {
        updates.push(body.metadata)
        return {}
      },
    },
  } as unknown as MixedbreadClient
  return {
    updates,
    stores: makeStoreClient({
      client,
      repository: "Effect-TS/website",
      storePrefix: "effect-website-pr-",
    }),
  }
}

const sync = { kind: "preview", pullRequest: 1, revision: "abc" } as const

test("records the hidden files and the sync next to the store metadata", async () => {
  const { stores, updates } = makeClient()

  await Effect.runPromise(
    stores.recordPreviewSync(
      store({ lifecycle: "pull-request-preview", other: "kept" }),
      { ...sync, storeId: "store-1" },
      ["b", "a"],
    ),
  )

  assert.deepEqual(updates, [
    {
      other: "kept",
      lifecycle: "pull-request-preview",
      pullRequest: 1,
      repository: "Effect-TS/website",
      revision: "abc",
      hidden_files_0: "a,b",
    },
  ])
})

test("replaces the hidden files of an earlier sync", async () => {
  const { stores, updates } = makeClient()

  await Effect.runPromise(
    stores.recordPreviewSync(
      store({ hidden_files_0: "old", hidden_files_1: "older" }),
      { ...sync, storeId: "store-1" },
      [],
    ),
  )

  assert.deepEqual(Object.keys(updates[0] as object).sort(), [
    "lifecycle",
    "pullRequest",
    "repository",
    "revision",
  ])
})

test("fails without updating when the hidden files do not fit the metadata", async () => {
  const { stores, updates } = makeClient()
  const hidden = Array.from(
    { length: 4_000 },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  )

  const error = await Effect.runPromise(
    Effect.flip(
      stores.recordPreviewSync(
        store({}),
        { ...sync, storeId: "store-1" },
        hidden,
      ),
    ),
  )

  assert.equal(error._tag, "InvalidStoreError")
  assert.deepEqual(updates, [])
})
