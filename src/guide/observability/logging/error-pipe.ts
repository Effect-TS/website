import { Effect } from "effect"

const task = Effect.fail("Oh uh!").pipe(Effect.as(2))

const program = task.pipe(
  Effect.catchAll((error) => Effect.logError(error).pipe(Effect.as(0)))
)

Effect.runPromise(program)
/*
timestamp=... level=ERROR fiber=#0 message="Oh uh!"
*/
