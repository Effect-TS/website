import { Effect, TestClock, Fiber, Option, TestContext, pipe } from "effect"
import * as assert from "node:assert"

const test = pipe(
  Effect.sleep("5 minutes"),
  Effect.timeoutTo({
    duration: "1 minutes",
    onSuccess: Option.some,
    onTimeout: () => Option.none<void>()
  }),
  Effect.fork,
  Effect.tap(() =>
    // Adjust the TestClock by 1 minute to simulate the passage of time
    TestClock.adjust("1 minutes")
  ),
  Effect.flatMap((fiber) =>
    // Get the result of the fiber
    Fiber.join(fiber)
  ),
  Effect.map((result) => {
    // Check if the result is None, indicating a timeout
    assert.ok(Option.isNone(result))
  }),
  Effect.provide(TestContext.TestContext)
)

Effect.runPromise(test)
