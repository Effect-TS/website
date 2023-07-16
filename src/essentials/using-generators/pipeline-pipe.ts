import { pipe, Effect } from "effect"

const increment = (x: number) => x + 1

const divide = (a: number, b: number): Effect.Effect<never, Error, number> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

// $ExpectType Effect<never, Error, string>
const program = pipe(
  Effect.all([Effect.succeed(10), Effect.succeed(2)]),
  Effect.flatMap(([a, b]) => divide(a, b)),
  Effect.map((n1) => increment(n1)),
  Effect.map((n2) => `Result is: ${n2}`)
)

console.log(Effect.runSync(program)) // Output: "Result is: 6"
