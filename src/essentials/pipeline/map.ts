import { pipe, Effect } from "effect"

const increment = (x: number) => x + 1

// Effect<never, never, number>
const mappedEffect = pipe(
  Effect.succeed(5),
  Effect.map((x) => increment(x))
)

console.log(Effect.runSync(mappedEffect)) // Output: 6
