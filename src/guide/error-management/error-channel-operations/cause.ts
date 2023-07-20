import { Effect } from "effect"

// $ExpectType Effect<never, string, number>
const task = Effect.fail("Oh uh!").pipe(Effect.as(2))

// $ExpectType Effect<never, never, Cause<string>>
const cause = Effect.cause(task)

// $ExpectType Effect<never, never, void>
const program = cause.pipe(Effect.flatMap(Effect.log))

Effect.runPromise(program)
/*
timestamp=... level=INFO fiber=#0 cause="Error: Oh uh!"
*/
