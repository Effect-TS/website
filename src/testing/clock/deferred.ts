import { Effect, Deferred, TestClock, TestContext } from "effect"
import * as assert from "node:assert"

const test = Effect.gen(function* (_) {
  // Create a deferred value
  const deferred = yield* _(Deferred.make<void, number>())

  // Run two effects concurrently: sleep for 10 seconds and succeed the deferred with a value of 1
  yield* _(
    Effect.all([Effect.sleep("10 seconds"), Deferred.succeed(deferred, 1)], {
      concurrency: "unbounded"
    }),
    Effect.fork
  )

  // Adjust the TestClock by 10 seconds
  yield* _(TestClock.adjust("10 seconds"))

  // Await the value from the deferred
  const readRef = yield* _(Deferred.await(deferred))

  assert.ok(1 === readRef)
}).pipe(Effect.provide(TestContext.TestContext))

Effect.runPromise(test)
