import { pipe, Effect } from "effect"

const increment = (x: number) => x + 1

// $ExpectType Effect<number, never, never>
const mappedEffect = pipe(
  Effect.succeed(5),
  Effect.map((x) => increment(x))
)

Effect.runPromise(mappedEffect).then(console.log) // Output: 6
