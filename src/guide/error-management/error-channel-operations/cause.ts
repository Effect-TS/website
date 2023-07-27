import { Effect } from "effect"

// $ExpectType Effect<never, string, number>
const task = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<never, never, Cause<string>>
const taskCause = Effect.cause(task)

// $ExpectType Effect<never, never, void>
const program = Effect.flatMap(taskCause, (cause) => Effect.log(cause))

Effect.runPromise(program)
/*
timestamp=... level=INFO fiber=#0 cause="Error: Oh uh!"
*/
