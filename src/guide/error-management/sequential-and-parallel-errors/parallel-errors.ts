import { Effect, Exit } from "effect"

const fail = Effect.fail("Oh uh!")
const die = Effect.dieMessage("Boom!")

// $ExpectType Effect<never, string, void>
const program = Effect.all([fail, die], { concurrency: "unbounded" }).pipe(
  Effect.asUnit
)

Effect.runPromiseExit(program).then((exit) => {
  if (Exit.isFailure(exit)) {
    console.log(exit.cause._tag)
    console.log(JSON.stringify(exit.cause, null, 2))
  }
})
/*
Output:
Parallel
{
  "_tag": "Cause",
  "errors": [
    {
      "message": "Error: Oh uh!"
    },
    {
      "message": "RuntimeException: Boom!"
    }
  ]
}
*/
