import { Effect } from "effect"

const myeffect = Effect.asUnit(Effect.fail("Something went wrong!"))

// $ExpectType Effect<never, never, void>
const program = myeffect.pipe(
  Effect.catchAll((error) => Effect.logWarning(String(error)))
)

Effect.runPromise(program)
/*
timestamp=... level=WARN fiber=#0 message="Something went wrong!"
*/
