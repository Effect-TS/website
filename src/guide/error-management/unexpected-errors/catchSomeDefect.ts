import { Effect, Cause, Option } from "effect"

// $ExpectType Effect<never, never, void>
const program = Effect.catchSomeDefect(
  Effect.dieMessage("Boom!"), // Simulating a runtime error
  (defect) => {
    if (Cause.isIllegalArgumentException(defect)) {
      return Option.some(
        Effect.logFatal(
          `Caught an IllegalArgumentException defect: ${defect.message}`
        )
      )
    }
    return Option.none()
  }
)

// Since we are only catching IllegalArgumentException
// we will get an Exit.Failure because we simulated a runtime error.
console.log(Effect.runSyncExit(program))
/*
{ _tag: 'Failure', cause: { _tag: 'Cause', errors: [ [Object] ] } }
*/
