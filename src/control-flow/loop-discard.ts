import { Effect, Console } from "effect"

// $ExpectType Effect<void, never, never>
const result = Effect.loop(
  1, // Initial state
  {
    while: (state) => state <= 5, // Condition to continue looping,
    step: (state) => state + 1, // State update function,
    body: (state) => Console.log(`Currently at state ${state}`), // Effect to be performed on each iteration,
    discard: true
  }
)

Effect.runPromise(result).then(console.log)
/*
Output:
Currently at state 1
Currently at state 2
Currently at state 3
Currently at state 4
Currently at state 5
undefined
*/
