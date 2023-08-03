import { Effect } from "effect"

// $ExpectType Effect<never, never, number>
const result = Effect.iterate(
  1, // Initial state
  {
    while: (n) => n <= 5, // Condition to continue iterating
    body: (n) => Effect.succeed(n + 1) // Operation to change the state
  }
)

console.log(Effect.runSync(result)) // Output: 6
