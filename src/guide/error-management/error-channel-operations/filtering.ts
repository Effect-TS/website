import { Effect, Random, Cause } from "effect"

// $ExpectType Effect<never, string, number>
const program1 = Effect.filterOrFail(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => "random number is negative"
)

// $ExpectType Effect<never, never, number>
const program2 = Effect.filterOrDie(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => Cause.IllegalArgumentException("random number is negative")
)

// $ExpectType Effect<never, never, number>
const program3 = Effect.filterOrDieMessage(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  "random number is negative"
)

// $ExpectType Effect<never, never, number>
const program4 = Effect.filterOrElse(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => program3
)
