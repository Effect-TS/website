import { Effect, TestClock, Fiber, Option, TestContext } from "effect"
import * as assert from "node:assert"

const test = Effect.gen(function* (_) {
  // Create a fiber that sleeps for 5 minutes and then times out after 1 minute
  const fiber = yield* _(
    Effect.sleep("5 minutes"),
    Effect.timeout("1 minutes"),
    Effect.fork
  )

  // Adjust the TestClock by 1 minute to simulate the passage of time
  yield* _(TestClock.adjust("1 minutes"))

  // Get the result of the fiber
  const result = yield* _(Fiber.join(fiber))

  // Check if the result is None, indicating a timeout
  assert.ok(Option.isNone(result))
}).pipe(Effect.provide(TestContext.TestContext))

Effect.runPromise(test)
