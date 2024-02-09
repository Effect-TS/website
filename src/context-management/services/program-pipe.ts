import { Effect, Console } from "effect"
import { Random } from "./service"

// $ExpectType Effect<void, never, Random>
const program = Random.pipe(
  Effect.flatMap((random) => random.next),
  Effect.flatMap((randomNumber) =>
    Console.log(`random number: ${randomNumber}`)
  )
)

// $ExpectType Effect<void, never, never>
const runnable = Effect.provideService(program, Random, {
  next: Effect.sync(() => Math.random())
})

Effect.runPromise(runnable)
/*
Output:
random number: 0.8241872233134417
*/
