import { Effect, Cause } from "effect"

// $ExpectType Effect<never, never, void>
const program = Effect.dieMessage("Boom!") // Simulating a runtime error
  .pipe(
    Effect.catchAllDefect((defect) => {
      if (Cause.isRuntimeException(defect)) {
        return Effect.log(
          `RuntimeException defect caught: ${defect.message}`,
          "Fatal"
        )
      }
      return Effect.log("Unknown defect caught.", "Fatal")
    })
  )

// We get an Exit.Success because we caught all defects
console.log(JSON.stringify(Effect.runSyncExit(program)))
/*
... level=FATAL fiber=#0 message="RuntimeException defect caught: Boom!"
{"_tag":"Success"}
*/
