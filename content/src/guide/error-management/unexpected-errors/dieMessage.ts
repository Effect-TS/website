import { Effect } from "effect"

const divide = (a: number, b: number): Effect.Effect<never, never, number> =>
  b === 0 ? Effect.dieMessage("Cannot divide by zero") : Effect.succeed(a / b)

Effect.runSync(divide(1, 0)) // throws RuntimeException: Cannot divide by zero
