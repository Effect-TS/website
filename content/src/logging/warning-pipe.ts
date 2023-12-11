import { Effect } from "effect"

const task = Effect.fail("Oh uh!").pipe(Effect.as(2))

const program = task.pipe(
  Effect.catchAll((error) => Effect.logWarning(error).pipe(Effect.as(0)))
)

Effect.runPromise(program)
/*
Output:
... level=WARN fiber=#0 message="Oh uh!"
*/
