import { Effect, Console } from "effect"

// $ExpectType Effect<number[], never, never>
const result = Effect.forEach([1, 2, 3, 4, 5], (n, index) =>
  Console.log(`Currently at index ${index}`).pipe(Effect.as(n * 2))
)

Effect.runPromise(result).then(console.log)
/*
Output:
Currently at index 0
Currently at index 1
Currently at index 2
Currently at index 3
Currently at index 4
[ 2, 4, 6, 8, 10 ]
*/
