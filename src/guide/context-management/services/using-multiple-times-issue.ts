import { Effect, Console } from "effect"
import { Random } from "./service"

// $ExpectType Effect<Random, never, void>
const program = Random.pipe(
  Effect.flatMap((random) => random.next),
  Effect.flatMap((randomNumber) =>
    Console.log(`random number: ${randomNumber}`)
  ),
  Effect.flatMap(() => Console.log(`another random number: ???`)) // <= I can't access the random service here
)
