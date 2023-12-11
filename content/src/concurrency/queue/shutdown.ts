import { Effect, Queue, Fiber } from "effect"

const program = Effect.gen(function* (_) {
  const queue = yield* _(Queue.bounded<number>(3))
  const fiber = yield* _(Effect.fork(Queue.take(queue)))
  yield* _(Queue.shutdown(queue)) // will interrupt fiber
  yield* _(Fiber.join(fiber)) // will terminate
})
