import { Effect, Cause, Console } from "effect"

// $ExpectType Effect<void, never, never>
const program = Effect.catchAllDefect(
  Effect.dieMessage("Boom!"), // Simulating a runtime error
  (defect) => {
    if (Cause.isRuntimeException(defect)) {
      return Console.log(`RuntimeException defect caught: ${defect.message}`)
    }
    return Console.log("Unknown defect caught.")
  }
)

// We get an Exit.Success because we caught all defects
Effect.runPromiseExit(program).then(console.log)
/*
Output:
RuntimeException defect caught: Boom!
{
  _id: "Exit",
  _tag: "Success",
  value: undefined
}
*/
