import { Effect, Cause, Console } from "effect"

// $ExpectType Effect<never, never, void>
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
console.log(Effect.runSyncExit(program))
/*
RuntimeException defect caught: Boom!
{ _tag: 'Success', value: undefined }
*/
