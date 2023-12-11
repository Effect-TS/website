import { Effect, PubSub, Queue, Console } from "effect"

const program = PubSub.bounded<string>(2).pipe(
  Effect.flatMap((pubsub) =>
    Effect.scoped(
      Effect.gen(function* (_) {
        const dequeue1 = yield* _(PubSub.subscribe(pubsub))
        const dequeue2 = yield* _(PubSub.subscribe(pubsub))
        yield* _(PubSub.publish(pubsub, "Hello from a PubSub!"))
        yield* _(Queue.take(dequeue1).pipe(Effect.flatMap(Console.log)))
        yield* _(Queue.take(dequeue2).pipe(Effect.flatMap(Console.log)))
      })
    )
  )
)

Effect.runPromise(program)
/*
Output:
Hello from a PubSub!
Hello from a PubSub!
*/
