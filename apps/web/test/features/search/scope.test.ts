import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { TestClock } from "effect/testing"
import {
  cacheOverlay,
  searchScope,
} from "../../../src/features/search/scope.ts"

test("searches production alone outside previews", () => {
  assert.deepEqual(
    searchScope({ production: "prod", overlay: Option.none() }),
    { store_identifiers: ["prod"] },
  )
})

test("searches production and the preview store, hiding replaced production files", () => {
  assert.deepEqual(
    searchScope({
      production: "prod",
      overlay: Option.some({
        id: "pr-1",
        metadata: { hidden_files_0: "b,a" },
      }),
    }),
    {
      store_identifiers: ["prod", "pr-1"],
      file_ids: ["not_in", ["a", "b"]],
    },
  )
})

test("omits the file filter when the preview hides nothing", () => {
  assert.deepEqual(
    searchScope({
      production: "prod",
      overlay: Option.some({
        id: "pr-1",
        metadata: { lifecycle: "pull-request-preview" },
      }),
    }),
    { store_identifiers: ["prod", "pr-1"] },
  )
})

const counted = () => {
  let calls = 0
  const retrieve = Effect.suspend(() =>
    ++calls % 2 === 0
      ? Effect.succeed({ id: "pr-1", metadata: { call: calls } })
      : Effect.fail("unavailable" as const),
  )
  return { retrieve, calls: () => calls }
}

test("keeps the preview store for 30 seconds and retries after a failure", async () => {
  const { retrieve, calls } = counted()

  await Effect.runPromise(
    Effect.gen(function* () {
      const overlay = yield* cacheOverlay(retrieve)

      assert.equal(yield* Effect.flip(overlay), "unavailable")
      assert.equal(calls(), 1)

      const first = yield* overlay
      assert.deepEqual(Option.getOrUndefined(first)?.metadata, { call: 2 })

      yield* TestClock.adjust("29 seconds")
      yield* overlay
      assert.equal(calls(), 2)

      yield* TestClock.adjust("2 seconds")
      assert.equal(yield* Effect.flip(overlay), "unavailable")
      assert.equal(calls(), 3)
    }).pipe(Effect.provide(TestClock.layer())),
  )
})
