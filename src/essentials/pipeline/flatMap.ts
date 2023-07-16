import { pipe, Effect } from "effect"

const divide = (a: number, b: number): Effect.Effect<never, Error, number> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

// $ExpectType Effect<never, Error, number>
const flatMappedEffect = pipe(
  Effect.succeed([10, 2]),
  Effect.flatMap(([a, b]) => divide(a, b))
)

console.log(Effect.runSync(flatMappedEffect)) // Output: 5
