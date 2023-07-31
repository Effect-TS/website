import { Effect } from "effect"

const task = Effect.fail("Oh uh!").pipe(Effect.as(2))

const program = task.pipe(
  Effect.catchAll((error) => Effect.logFatal(error).pipe(Effect.as(0)))
)

Effect.runPromise(program)
/*
timestamp=... level=FATAL fiber=#0 message="Oh uh!"
*/
