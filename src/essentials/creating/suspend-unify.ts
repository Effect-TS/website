import { Effect } from "effect"

// $ExpectType (a: number, b: number) => Effect.Effect<never, Error, never> | Effect.Effect<number, never, never>
const ugly = (a: number, b: number) =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

// $ExpectType (a: number, b: number) => Effect.Effect<number, Error, never>
const nice = (a: number, b: number) =>
  Effect.suspend(() =>
    b === 0
      ? Effect.fail(new Error("Cannot divide by zero"))
      : Effect.succeed(a / b)
  )
