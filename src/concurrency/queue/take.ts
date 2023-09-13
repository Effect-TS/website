import { Effect, Queue, Fiber } from "effect"

const oldestItem = Effect.gen(function* (_) {
  const queue = yield* _(Queue.bounded<string>(100))
  const fiber = yield* _(Effect.fork(Queue.take(queue))) // will be suspended because the queue is empty
  yield* _(Queue.offer(queue, "something"))
  const value = yield* _(Fiber.join(fiber))
  return value
})

Effect.runPromise(oldestItem).then(console.log) // Output: something
