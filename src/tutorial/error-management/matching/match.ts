import { Effect } from "effect"

const success: Effect.Effect<never, Error, number> = Effect.succeed(42)
const failure: Effect.Effect<never, Error, number> = Effect.fail(
  new Error("Uh oh!")
)

// Effect<never, never, string>
const program1 = success.pipe(
  Effect.match({
    onFailure: (error) => `failure: ${error.message}`,
    onSuccess: (value) => `success: ${value}`,
  })
)
console.log(Effect.runSync(program1)) // Output: "success: 42"

// Effect<never, never, string>
const program2 = failure.pipe(
  Effect.match({
    onFailure: (error) => `failure: ${error.message}`,
    onSuccess: (value) => `success: ${value}`,
  })
)
console.log(Effect.runSync(program2)) // Output: "failure: Uh oh!"
