import { Effect } from "effect"
import { program } from "./error-tracking"

// $ExpectType Effect<string, never, never>
const recovered = program.pipe(
  Effect.catchTags({
    FooError: (_fooError) => Effect.succeed(`Recovering from FooError`),
    BarError: (_barError) => Effect.succeed(`Recovering from BarError`)
  })
)
