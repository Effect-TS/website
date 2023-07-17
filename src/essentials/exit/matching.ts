import { Effect, Exit } from "effect"

// $ExpectType Exit<never, number>
const simulatedSuccess = Effect.runSyncExit(Effect.succeed(1))

Exit.match(simulatedSuccess, {
  onFailure: (cause) =>
    console.error(`Exited with failure state: ${cause._tag}`),
  onSuccess: (value) => console.log(`Exited with success value: ${value}`),
})
// Output: "Exited with success value: 1"

// $ExpectType Exit<string, never>
const simulatedFailure = Effect.runSyncExit(Effect.fail("error"))

Exit.match(simulatedFailure, {
  onFailure: (cause) =>
    console.error(`Exited with failure state: ${cause._tag}`),
  onSuccess: (value) => console.log(`Exited with success value: ${value}`),
})
// Output: "Exited with failure state: Fail"
