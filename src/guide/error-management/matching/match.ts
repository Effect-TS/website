import { Effect } from "effect"

const success: Effect.Effect<never, Error, number> = Effect.succeed(42)
const failure: Effect.Effect<never, Error, number> = Effect.fail(
  new Error("Uh oh!")
)

// $ExpectType Effect<never, never, string>
const program1 = Effect.match(success, {
  onFailure: (error) => `failure: ${error.message}`,
  onSuccess: (value) => `success: ${value}`
})

console.log(Effect.runSync(program1)) // Output: "success: 42"

// $ExpectType Effect<never, never, string>
const program2 = Effect.match(failure, {
  onFailure: (error) => `failure: ${error.message}`,
  onSuccess: (value) => `success: ${value}`
})

console.log(Effect.runSync(program2)) // Output: "failure: Uh oh!"
