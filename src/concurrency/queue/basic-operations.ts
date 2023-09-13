import { Effect, Queue } from "effect"

// $ExpectType Effect<never, never, number>
const program = Effect.gen(function* (_) {
  const queue = yield* _(Queue.bounded<number>(100))
  yield* _(Queue.offer(queue, 1)) // Add 1 to the queue
  const value = yield* _(Queue.take(queue)) // Retrieve and remove the oldest value
  return value
})

Effect.runPromise(program).then(console.log) // Output: 1
