import { Effect, Queue, Fiber } from "effect"

const program = Effect.gen(function* (_) {
  const queue = yield* _(Queue.bounded<number>(1))
  yield* _(Queue.offer(queue, 1))
  const fiber = yield* _(Effect.fork(Queue.offer(queue, 2))) // will be suspended because the queue is full
  yield* _(Queue.take(queue))
  yield* _(Fiber.join(fiber))
})
