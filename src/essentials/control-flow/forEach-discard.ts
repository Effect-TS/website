import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const result = Effect.forEach(
  [1, 2, 3, 4, 5],
  (index) => Effect.sync(() => console.log(`Currently at index ${index}`)),
  { discard: true }
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
