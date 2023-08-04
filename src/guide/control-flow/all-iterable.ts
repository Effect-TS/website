import { Effect } from "effect"

const iterable: Iterable<Effect.Effect<never, never, number>> = [1, 2, 3].map(
  (n) => Effect.succeed(n).pipe(Effect.tap(Effect.log))
)

// $ExpectType Effect<never, never, number[]>
const combinedEffect = Effect.all(iterable)

console.log(Effect.runSync(combinedEffect))
/*
... message=1
... message=2
... message=3
[ 1, 2, 3 ]
*/
