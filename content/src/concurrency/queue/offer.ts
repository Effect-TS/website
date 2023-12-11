import { Effect, Queue } from "effect"

const program = Effect.gen(function* (_) {
  const queue = yield* _(Queue.bounded<number>(100))
  yield* _(Queue.offer(queue, 1)) // put 1 in the queue
})
