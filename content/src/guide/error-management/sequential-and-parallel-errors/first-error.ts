import { Effect } from "effect"

const fail = Effect.fail("Oh uh!")
const die = Effect.dieMessage("Boom!")

// $ExpectType Effect<never, string, void>
const program = Effect.all([fail, die]).pipe(
  Effect.zipRight(die),
  Effect.asUnit
)

Effect.runPromise(program).then(console.log, console.error)
/*
Output:
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Fail",
    failure: "Oh uh!"
  }
}
*/
