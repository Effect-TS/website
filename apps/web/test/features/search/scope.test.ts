import { assert, test } from "vite-plus/test"
import * as Effect from "effect/Effect"
import { TestClock } from "effect/testing"
import {
  cacheScope,
  previewScope,
  productionScope,
} from "../../../src/features/search/scope.ts"

test("searches production alone outside previews", () => {
  assert.deepEqual(productionScope("prod"), { store_identifiers: ["prod"] })
})

test("searches production and the preview store, hiding replaced production files", () => {
  assert.deepEqual(
    previewScope("prod", {
      id: "pr-1",
      metadata: { hidden_files_0: "b,a" },
    }),
    {
      store_identifiers: ["prod", "pr-1"],
      file_ids: ["not_in", ["a", "b"]],
    },
  )
})

test("omits the file filter when the preview hides nothing", () => {
  assert.deepEqual(
    previewScope("prod", {
      id: "pr-1",
      metadata: { lifecycle: "pull-request-preview" },
    }),
    { store_identifiers: ["prod", "pr-1"] },
  )
})

const counted = () => {
  let calls = 0
  const retrieve = Effect.suspend(() =>
    ++calls % 2 === 0
      ? Effect.succeed(productionScope(`call-${calls}`))
      : Effect.fail("unavailable" as const),
  )
  return { retrieve, calls: () => calls }
}

test("keeps the scope for 30 seconds and retries after a failure", async () => {
  const { retrieve, calls } = counted()

  await Effect.runPromise(
    Effect.gen(function* () {
      const scope = yield* cacheScope(retrieve)

      assert.equal(yield* Effect.flip(scope), "unavailable")
      assert.equal(calls(), 1)

      assert.deepEqual(yield* scope, { store_identifiers: ["call-2"] })

      yield* TestClock.adjust("29 seconds")
      yield* scope
      assert.equal(calls(), 2)

      yield* TestClock.adjust("2 seconds")
      assert.equal(yield* Effect.flip(scope), "unavailable")
      assert.equal(calls(), 3)
    }).pipe(Effect.provide(TestClock.layer())),
  )
})
