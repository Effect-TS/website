import { Effect } from "effect"
import { program } from "./error-tracking"

// $ExpectType Effect<string, BarError, never>
const recovered = program.pipe(
  Effect.catchTag("FooError", (_fooError) =>
    Effect.succeed("Recovering from FooError")
  )
)
