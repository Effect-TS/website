import { Effect, Hub, Console } from "effect"

const program = Hub.bounded<number>(2).pipe(
  Effect.tap((hub) => Console.log(`capacity: ${Hub.capacity(hub)}`)),
  Effect.tap((hub) =>
    Hub.size(hub).pipe(Effect.flatMap((size) => Console.log(`size: ${size}`)))
  )
)

Effect.runPromise(program)
/*
Output:
capacity: 2
size: 0
*/
