import { Effect, Console } from "effect"
import { Random } from "./service"

// $ExpectType Effect<Random, never, void>
const program = Random.pipe(
  Effect.flatMap((random) =>
    random.next.pipe(
      Effect.flatMap((randomNumber) =>
        Console.log(`random number: ${randomNumber}`)
      ),
      Effect.flatMap(() => random.next),
      Effect.flatMap((randomNumber) =>
        Console.log(`another random number: ${randomNumber}`)
      )
    )
  )
)

// $ExpectType Effect<never, never, void>
const runnable = Effect.provideService(program, Random, {
  next: Effect.sync(() => Math.random())
})

Effect.runPromise(runnable).then(console.log)
/*
Output:
random number: 0.8241872233134417
another random number: 0.8241872233134417
*/
