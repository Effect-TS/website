import { Effect } from "effect"

// Define three effects representing different tasks.
const task1 = Effect.sync(() => console.log("Executing task1..."))
const task2 = Effect.fail(new Error("Something went wrong!"))
const task3 = Effect.sync(() => console.log("Executing task3..."))

// Compose the three tasks to run them in sequence.
// If one of the tasks fails, the subsequent tasks won't be executed.
const program = Effect.gen(function* (_) {
  yield* _(task1)
  yield* _(task2) // After task1, task2 is executed, but it fails with an error
  yield* _(task3) // This computation won't be executed because the previous one fails
})

// $ExpectType Exit<Error, void>
const result = Effect.runSyncExit(program)

console.log("result: ", result)

/*
Executing task1...
result: <Failure("Something went wrong!")>
*/
