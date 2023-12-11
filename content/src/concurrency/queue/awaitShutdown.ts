import { Effect, Queue, Fiber, Console } from "effect"

const program = Effect.gen(function* (_) {
  const queue = yield* _(Queue.bounded<number>(3))
  const fiber = yield* _(
    Effect.fork(
      Queue.awaitShutdown(queue).pipe(
        Effect.flatMap(() => Console.log("shutting down"))
      )
    )
  )
  yield* _(Queue.shutdown(queue))
  yield* _(Fiber.join(fiber))
})

Effect.runPromise(program) // Output: shutting down
