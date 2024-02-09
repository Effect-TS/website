import { Effect } from "effect"

const divide = (a: number, b: number): Effect.Effect<number, Error> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

// $ExpectType Effect<number, never, never>
const program = Effect.orDie(divide(1, 0))

Effect.runSync(program) // throws Error: Cannot divide by zero
