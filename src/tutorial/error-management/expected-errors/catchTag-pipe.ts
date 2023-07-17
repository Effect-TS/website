import { Effect } from "effect"
import { program } from "./error-accumulation"

// $ExpectType Effect<never, BarError, string>
const recovered = program.pipe(
  Effect.catchTag("FooError", (_fooError) =>
    Effect.succeed("Recovering from FooError")
  )
)
