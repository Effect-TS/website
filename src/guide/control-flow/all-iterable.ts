import { Effect, Console } from "effect"

const iterable: Iterable<Effect.Effect<never, never, number>> = [1, 2, 3].map(
  (n) => Effect.succeed(n).pipe(Effect.tap(Console.log))
)

// $ExpectType Effect<never, never, number[]>
const combinedEffect = Effect.all(iterable)

console.log(Effect.runSync(combinedEffect))
/*
Output:
1
2
3
[ 1, 2, 3 ]
*/
