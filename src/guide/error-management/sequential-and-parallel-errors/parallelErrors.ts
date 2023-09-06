import { Effect, Exit, Cause } from "effect"

const fail1 = Effect.fail("Oh uh!")
const fail2 = Effect.fail("Oh no!")
const die = Effect.dieMessage("Boom!")

// $ExpectType Effect<never, string[], void>
const program = Effect.all([fail1, fail2, die], {
  concurrency: "unbounded"
}).pipe(Effect.asUnit, Effect.parallelErrors)

Effect.runPromiseExit(program).then((exit) => {
  if (Exit.isFailure(exit) && Cause.isFailType(exit.cause)) {
    console.log(exit.cause.error)
  }
})
/*
Output:
[ 'Oh uh!', 'Oh no!' ]
*/
