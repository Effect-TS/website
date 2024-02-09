import { Effect } from "effect"

const fail = Effect.fail("Oh uh!")
const die = Effect.dieMessage("Boom!")

// $ExpectType Effect<void, string, never>
const program = Effect.all([fail, die], { concurrency: "unbounded" }).pipe(
  Effect.asUnit
)

Effect.runPromise(program).then(console.log, console.error)
/*
Output:
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Parallel",
    errors: [
      {
        message: "Error: Oh uh!"
      }, {
        message: "Error: RuntimeException: Boom!"
      }
    ]
  }
}
*/
