import { Effect } from "effect"

const operation1 = Effect.sync(() => console.log("operation1"))
const operation2 = Effect.fail(new Error("Something went wrong!"))
const operation3 = Effect.sync(() => console.log("operation3"))

// $ExpectType Exit<Error, void>
const result = Effect.runSyncExit(
  Effect.gen(function* (_) {
    yield* _(operation1)
    yield* _(operation2)
    yield* _(operation3) // This computation won't be executed because the previous one fails
  })
)

console.log(result)

/*
operation1
Failure("Something went wrong!")
*/
