import { Effect } from "effect"

const fail = Effect.fail("Oh uh!")
const die = Effect.dieMessage("Boom!")

const program = fail.pipe(Effect.ensuring(die))

Effect.runPromise(program).then(console.log, console.error)
/*
Output:
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Sequential",
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
