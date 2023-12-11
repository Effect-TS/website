import { Effect, Console } from "effect"

// Define three effects representing different tasks.
const task1 = Console.log("Executing task1...")
const task2 = Effect.fail("Something went wrong!")
const task3 = Console.log("Executing task3...")

// Compose the three tasks to run them in sequence.
// If one of the tasks fails, the subsequent tasks won't be executed.
const program = Effect.gen(function* (_) {
  yield* _(task1)
  yield* _(task2) // After task1, task2 is executed, but it fails with an error
  yield* _(task3) // This computation won't be executed because the previous one fails
})

Effect.runPromise(program).then(console.log, console.error)
/*
Output:
Executing task1...
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Fail",
    failure: "Something went wrong!"
  }
}
*/
