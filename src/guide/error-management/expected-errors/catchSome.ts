import { Effect, Option } from "effect"
import { program } from "./error-tracking"

// $ExpectType Effect<never, FooError | BarError, string>
const recovered = program.pipe(
  Effect.catchSome((error) => {
    if (error._tag === "FooError") {
      return Option.some(Effect.succeed("Recovering from FooError"))
    }
    return Option.none()
  })
)
