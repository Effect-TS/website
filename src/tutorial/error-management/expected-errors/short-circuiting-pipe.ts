import { Effect } from "effect"

const operation1 = Effect.sync(() => console.log("operation1"))
const operation2 = Effect.fail(new Error("Something went wrong!"))
const operation3 = Effect.sync(() => console.log("operation3"))

const result = Effect.runSyncExit(
  operation1.pipe(
    Effect.flatMap(() => operation2),
    Effect.flatMap(() => operation3) // This computation won't be executed because the previous one fails
  )
)

console.log(result)

/*
operation1
Failure("Something went wrong!")
*/
