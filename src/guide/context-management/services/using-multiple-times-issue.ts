import { Effect } from "effect"
import { Random } from "./service"

// $ExpectType Effect<Random, never, void>
const program = Random.pipe(
  Effect.flatMap((random) => random.next()),
  Effect.flatMap((randomNumber) =>
    Effect.log(`random number: ${randomNumber}`)
  ),
  Effect.flatMap(() => Effect.log(`another random number: ???`)) // <= I can't access the random service here?
)
