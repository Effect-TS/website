import { Effect, Cause, Option } from "effect"

// Effect<never, never, void>
const program = Effect.dieMessage("Boom!") // Simulating a runtime error
  .pipe(
    Effect.catchSomeDefect((defect) => {
      if (Cause.isIllegalArgumentException(defect)) {
        return Option.some(
          Effect.log(
            `Caught an IllegalArgumentException defect: ${defect.message}`,
            { level: "Fatal" }
          )
        )
      }
      return Option.none()
    })
  )

// Since we are only catching IllegalArgumentException
// we will get an Exit.Failure because we simulated a runtime error.
console.log(JSON.stringify(Effect.runSyncExit(program)))
// Output: {"_tag":"Failure", ... }
