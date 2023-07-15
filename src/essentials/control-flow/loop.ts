import { Effect } from "effect"

// Effect<never, never, number[]>
const result = Effect.loop(
  1, // Initial state
  {
    while: (n) => n <= 5, // Condition to continue looping
    step: (n) => n + 1, // State update function
    body: (n) => Effect.succeed(n), // Effect to be performed on each iteration
  }
)

console.log(Effect.runSync(result)) // Output: [1, 2, 3, 4, 5]
