import { Effect, PubSub, Queue, Console } from "effect"

const program = PubSub.bounded<string>(2).pipe(
  Effect.flatMap((pubsub) =>
    Effect.scoped(
      Effect.gen(function* (_) {
        const dequeue = yield* _(PubSub.subscribe(pubsub))
        yield* _(PubSub.publishAll(pubsub, ["Message 1", "Message 2"]))
        yield* _(Queue.takeAll(dequeue).pipe(Effect.flatMap(Console.log)))
      })
    )
  )
)

Effect.runPromise(program)
/*
Output:
{
  _id: "Chunk",
  values: [ "Message 1", "Message 2" ]
}
*/
