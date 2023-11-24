import { Effect } from "effect"

// $ExpectType (a: number, b: number) => Effect<never, never, number> | Effect<never, Error, never>
const ugly = (a: number, b: number) =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

// $ExpectType (a: number, b: number) => Effect<never, Error, number>
const nice = (a: number, b: number) =>
  Effect.suspend(() =>
    b === 0
      ? Effect.fail(new Error("Cannot divide by zero"))
      : Effect.succeed(a / b)
  )
