import { Effect } from "effect"

// $ExpectType Effect<number, never, never>
const result = Effect.iterate(
  1, // Initial result
  {
    while: (result) => result <= 5, // Condition to continue iterating
    body: (result) => Effect.succeed(result + 1) // Operation to change the result
  }
)

Effect.runPromise(result).then(console.log) // Output: 6
