import { Effect, Clock, TestClock, TestContext, pipe } from "effect"
import * as assert from "node:assert"

const test = pipe(
  // Get the current time using the Clock
  Clock.currentTimeMillis,
  Effect.flatMap((startTime) =>
    // Adjust the TestClock by 1 minute to simulate the passage of time
    TestClock.adjust("1 minutes").pipe(
      // Get the current time again
      Effect.flatMap(() => Clock.currentTimeMillis),
      Effect.map((endTime) => {
        // Check if the time difference is at least 60,000 milliseconds (1 minute)
        assert.ok(endTime - startTime >= 60_000)
      })
    )
  ),
  Effect.provide(TestContext.TestContext)
)

Effect.runPromise(test)
