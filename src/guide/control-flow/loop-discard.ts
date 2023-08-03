import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const result = Effect.loop(
  1, // Initial state
  {
    while: (n) => n <= 5, // Condition to continue looping,
    step: (n) => n + 1, // State update function,
    body: (index) =>
      Effect.sync(() => console.log(`Currently at index ${index}`)), // Effect to be performed on each iteration,
    discard: true
  }
)

console.log(Effect.runSync(result))
/*
Currently at index 1
Currently at index 2
Currently at index 3
Currently at index 4
Currently at index 5
undefined
*/
