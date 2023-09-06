import { Effect, Exit, Cause } from "effect"

const fail = Effect.fail("Oh uh!")
const die = Effect.dieMessage("Boom!")

// $ExpectType Effect<never, string, void>
const program = Effect.all([fail, die]).pipe(
  Effect.zipRight(die),
  Effect.asUnit
)

Effect.runPromiseExit(program).then((exit) => {
  if (Exit.isFailure(exit) && Cause.isFailType(exit.cause)) {
    console.log(exit.cause.error)
  }
})
/*
Output:
Oh uh!
*/
