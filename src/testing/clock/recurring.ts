import { Effect, Queue, TestClock, Option, TestContext } from "effect"
import * as assert from "node:assert"

const test = Effect.gen(function* (_) {
  const q = yield* _(Queue.unbounded())

  yield* _(
    Queue.offer(q, undefined),
    // Delay the effect for 60 minutes and repeat it forever
    Effect.delay("60 minutes"),
    Effect.forever,
    Effect.fork
  )

  // Check if no effect is performed before the recurrence period
  const a = yield* _(Queue.poll(q), Effect.map(Option.isNone))

  // Adjust the TestClock by 60 minutes to simulate the passage of time
  yield* _(TestClock.adjust("60 minutes"))

  // Check if an effect is performed after the recurrence period
  const b = yield* _(Queue.take(q), Effect.as(true))

  // Check if the effect is performed exactly once
  const c = yield* _(Queue.poll(q), Effect.map(Option.isNone))

  // Adjust the TestClock by another 60 minutes
  yield* _(TestClock.adjust("60 minutes"))

  // Check if another effect is performed
  const d = yield* _(Queue.take(q), Effect.as(true))
  const e = yield* _(Queue.poll(q), Effect.map(Option.isNone))

  // Ensure that all conditions are met
  assert.ok(a && b && c && d && e)
}).pipe(Effect.provide(TestContext.TestContext))

Effect.runPromise(test)
