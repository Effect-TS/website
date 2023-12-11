import { Effect } from "effect"
import { program } from "./error-tracking"

// $ExpectType Effect<never, never, string>
const recovered = program.pipe(
  Effect.catchAll((error) => Effect.succeed(`Recovering from ${error._tag}`))
)
