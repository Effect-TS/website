import { Effect, Clock, TestClock, TestContext } from "effect"
import * as assert from "node:assert"

const test = Effect.gen(function* (_) {
  // Get the current time using the Clock
  const startTime = yield* _(Clock.currentTimeMillis)

  // Adjust the TestClock by 1 minute to simulate the passage of time
  yield* _(TestClock.adjust("1 minutes"))

  // Get the current time again
  const endTime = yield* _(Clock.currentTimeMillis)

  // Check if the time difference is at least 60,000 milliseconds (1 minute)
  assert.ok(endTime - startTime >= 60_000)
}).pipe(Effect.provide(TestContext.TestContext))

Effect.runPromise(test)
