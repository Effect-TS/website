import { Effect, Console } from "effect"

const iterable: Iterable<Effect.Effect<number>> = [1, 2, 3].map((n) =>
  Effect.succeed(n).pipe(Effect.tap(Console.log))
)

// $ExpectType Effect<number[], never, never>
const combinedEffect = Effect.all(iterable)

Effect.runPromise(combinedEffect).then(console.log)
/*
Output:
1
2
3
[ 1, 2, 3 ]
*/
