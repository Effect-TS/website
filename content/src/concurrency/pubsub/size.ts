import { Effect, PubSub, Console } from "effect"

const program = PubSub.bounded<number>(2).pipe(
  Effect.tap((pubsub) => Console.log(`capacity: ${PubSub.capacity(pubsub)}`)),
  Effect.tap((pubsub) =>
    PubSub.size(pubsub).pipe(
      Effect.flatMap((size) => Console.log(`size: ${size}`))
    )
  )
)

Effect.runPromise(program)
/*
Output:
capacity: 2
size: 0
*/
