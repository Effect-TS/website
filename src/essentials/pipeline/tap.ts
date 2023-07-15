import { pipe, Effect } from "effect"

const divide = (a: number, b: number): Effect.Effect<never, Error, number> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

const flatMappedEffect = pipe(
  Effect.succeed([10, 2]),
  Effect.tap(([a, b]) =>
    Effect.sync(() => console.log(`Performing division: ${a} / ${b}`))
  ),
  // [a, b] is still available!
  Effect.flatMap(([a, b]) => divide(a, b))
)

console.log(Effect.runSync(flatMappedEffect))
/*
Performing division: 10 / 2
5
*/
