import { Effect } from "effect"

const divide = (a: number, b: number): Effect.Effect<never, Error, number> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

// $ExpectType Effect<never, never, number>
const program = divide(1, 0).pipe(
  Effect.orDieWith((error) => new Error(`defect: ${error.message}`))
)

Effect.runSync(program) // throws Error("defect: Cannot divide by zero")
