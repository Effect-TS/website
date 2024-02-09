import { Effect, Deferred, TestClock, TestContext, pipe } from "effect"
import * as assert from "node:assert"

const test = pipe(
  // Create a deferred value
  Deferred.make<number, void>(),
  Effect.tap((deferred) =>
    // Run two effects concurrently: sleep for 10 seconds and succeed the deferred with a value of 1
    Effect.fork(
      Effect.all([Effect.sleep("10 seconds"), Deferred.succeed(deferred, 1)], {
        concurrency: "unbounded"
      })
    )
  ),
  // Adjust the TestClock by 10 seconds
  Effect.tap(() => TestClock.adjust("10 seconds")),
  // Await the value from the deferred
  Effect.flatMap((deferred) => Deferred.await(deferred)),
  Effect.map((readRef) => {
    assert.ok(1 === readRef)
  }),
  Effect.provide(TestContext.TestContext)
)

Effect.runPromise(test)
