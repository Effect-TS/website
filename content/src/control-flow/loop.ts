import { Effect } from "effect"

// $ExpectType Effect<never, never, number[]>
const result = Effect.loop(
  1, // Initial state
  {
    while: (state) => state <= 5, // Condition to continue looping
    step: (state) => state + 1, // State update function
    body: (state) => Effect.succeed(state) // Effect to be performed on each iteration
  }
)

Effect.runPromise(result).then(console.log) // Output: [1, 2, 3, 4, 5]
