import { Effect } from "effect"

const program = Effect.gen(function* (_) {
  console.log("Task1...")
  console.log("Task2...")
  yield* _(Effect.fail("Something went wrong!"))
  console.log("This won't be executed")
})

Effect.runPromise(program).then(console.log, console.error)
/*
Output:
Task1...
Task2...
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Fail",
    failure: "Something went wrong!"
  }
}
*/
