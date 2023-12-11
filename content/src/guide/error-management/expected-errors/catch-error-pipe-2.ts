import { Effect } from "effect"
import { program } from "./error-tracking"

// $ExpectType Effect<never, never, string>
const recovered = program.pipe(
  Effect.catchTag("FooError", (_fooError) =>
    Effect.succeed("Recovering from FooError")
  ),
  Effect.catchTag("BarError", (_barError) =>
    Effect.succeed("Recovering from BarError")
  )
)
