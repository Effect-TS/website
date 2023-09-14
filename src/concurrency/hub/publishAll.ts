import { Effect, Hub, Queue, Console } from "effect"

const program = Hub.bounded<string>(2).pipe(
  Effect.flatMap((hub) =>
    Effect.scoped(
      Effect.gen(function* (_) {
        const dequeue = yield* _(Hub.subscribe(hub))
        yield* _(Hub.publishAll(hub, ["Message 1", "Message 2"]))
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
