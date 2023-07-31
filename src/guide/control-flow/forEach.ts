import { Effect } from "effect"

// $ExpectType Effect<never, never, number[]>
const result = Effect.forEach([1, 2, 3, 4, 5], (n, index) =>
  Effect.sync(() => {
    console.log(`Currently at index ${index}`)
    return n * 2
  })
)

console.log(Effect.runSync(result))
/*
Currently at index 0
Currently at index 1
Currently at index 2
Currently at index 3
Currently at index 4
[ 2, 4, 6, 8, 10 ]
*/
