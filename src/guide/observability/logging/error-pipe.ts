import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const program = Effect.fail("Something went wrong!").pipe(
  Effect.catchAll((error) => Effect.log(String(error), "Error"))
)

Effect.runPromise(program)
/*
timestamp=... level=ERROR fiber=#0 message="Something went wrong!"
*/
