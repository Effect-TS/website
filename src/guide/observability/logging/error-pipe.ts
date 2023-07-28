import { Effect } from "effect"

const task = Effect.asUnit(Effect.fail("Something went wrong!"))

// $ExpectType Effect<never, never, void>
const program = task.pipe(
  Effect.catchAll((error) => Effect.logError(String(error)))
)

Effect.runPromise(program)
/*
timestamp=... level=ERROR fiber=#0 message="Something went wrong!"
*/
