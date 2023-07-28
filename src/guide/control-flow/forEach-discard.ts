import { Effect } from "effect"

// $ExpectType Effect<never, never, void>
const result = Effect.forEach(
  [1, 2, 3, 4, 5],
  (n, index) =>
    Effect.sync(() => {
      console.log(`Currently at index ${index}`)
      return n * 2
    }),
  { discard: true }
)

console.log(Effect.runSync(result))
/*
Currently at index 0
Currently at index 1
Currently at index 2
Currently at index 3
Currently at index 4
undefined
*/
