import { Effect } from "effect"

// $ExpectType Effect<never, never, number>
const result = Effect.iterate(
  1, // Initial result
  {
    while: (result) => result <= 5, // Condition to continue iterating
    body: (result) => Effect.succeed(result + 1) // Operation to change the result
  }
)

console.log(Effect.runSync(result)) // Output: 6
