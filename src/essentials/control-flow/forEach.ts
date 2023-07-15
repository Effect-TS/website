import { Effect } from "effect"

// Effect<never, never, number[]>
const result = Effect.forEach([1, 2, 3, 4, 5], (index) =>
  Effect.sync(() => {
    console.log(`Currently at index ${index}`)
    return index * 2
  })
)

console.log(Effect.runSync(result))
/*
Currently at index 1
Currently at index 2
Currently at index 3
Currently at index 4
Currently at index 5
[ 2, 4, 6, 8, 10 ]
*/
