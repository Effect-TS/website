import { Effect, Random, Cause } from "effect"

// $ExpectType Effect<number, string, never>
const task1 = Effect.filterOrFail(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => "random number is negative"
)

// $ExpectType Effect<number, never, never>
const task2 = Effect.filterOrDie(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => new Cause.IllegalArgumentException("random number is negative")
)

// $ExpectType Effect<number, never, never>
const task3 = Effect.filterOrDieMessage(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  "random number is negative"
)

// $ExpectType Effect<number, never, never>
const task4 = Effect.filterOrElse(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => task3
)
