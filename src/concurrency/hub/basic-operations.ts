import { Effect, Hub, Queue, Console } from "effect"

const program = Hub.bounded<string>(2).pipe(
  Effect.flatMap((hub) =>
    Effect.scoped(
      Effect.gen(function* (_) {
        const dequeue1 = yield* _(Hub.subscribe(hub))
        const dequeue2 = yield* _(Hub.subscribe(hub))
        yield* _(Hub.publish(hub, "Hello from a hub!"))
        yield* _(Queue.take(dequeue1).pipe(Effect.flatMap(Console.log)))
        yield* _(Queue.take(dequeue2).pipe(Effect.flatMap(Console.log)))
      })
    )
  )
)

Effect.runPromise(program)
/*
Output:
Hello from a hub!
Hello from a hub!
*/
