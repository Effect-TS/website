import { Effect } from "effect"

// $ExpectType Effect<never, string[], number[]>
const program = Effect.validateAll([1, 2, 3, 4, 5], (n) => {
  if (n < 4) {
    return Effect.succeed(n)
  } else {
    return Effect.fail(`${n} is not less that 4`)
  }
})

Effect.runPromise(program).then(console.log, console.error)
/*
Output:
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Fail",
    failure: [ "4 is not less that 4", "5 is not less that 4" ]
  }
}
*/
