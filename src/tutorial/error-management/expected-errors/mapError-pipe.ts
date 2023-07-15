import { Effect } from "effect"
import { program } from "./error-accumulation-pipe"

// Effect<never, Error, string>
const modified = program.pipe(
  Effect.mapError((error) => {
    if (error._tag === "FooError") {
      return new Error("Something went wrong with Foo")
    } else {
      return new Error("Something went wrong with Bar")
    }
  })
)
