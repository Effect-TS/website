import { Effect, Queue, TestClock, Option, TestContext, pipe } from "effect"
import * as assert from "node:assert"

const test = pipe(
  Queue.unbounded(),
  Effect.flatMap((q) =>
    pipe(
      Queue.offer(q, undefined),
      // Delay the effect for 60 minutes and repeat it forever
      Effect.delay("60 minutes"),
      Effect.forever,
      Effect.fork,
      Effect.flatMap(() =>
        pipe(
          Effect.Do,
          // Check if no effect is performed before the recurrence period
          Effect.bind("a", () =>
            pipe(Queue.poll(q), Effect.map(Option.isNone))
          ),
          // Adjust the TestClock by 60 minutes to simulate the passage of time
          Effect.tap(() => TestClock.adjust("60 minutes")),
          // Check if an effect is performed after the recurrence period
          Effect.bind("b", () => pipe(Queue.take(q), Effect.as(true))),
          // Check if the effect is performed exactly once
          Effect.bind("c", () =>
            pipe(Queue.poll(q), Effect.map(Option.isNone))
          ),
          // Adjust the TestClock by another 60 minutes
          Effect.tap(() => TestClock.adjust("60 minutes")),
          // Check if another effect is performed
          Effect.bind("d", () => pipe(Queue.take(q), Effect.as(true))),
          Effect.bind("e", () => pipe(Queue.poll(q), Effect.map(Option.isNone)))
        )
      ),
      Effect.map(({ a, b, c, d, e }) => {
        // Ensure that all conditions are met
        assert.ok(a && b && c && d && e)
      })
    )
  ),
  Effect.provide(TestContext.TestContext)
)

Effect.runPromise(test)
