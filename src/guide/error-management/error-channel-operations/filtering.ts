import { Effect, Random, Cause } from "effect"

// $ExpectType Effect<never, string, number>
const task1 = Effect.filterOrFail(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => "random number is negative"
)

// $ExpectType Effect<never, never, number>
const task2 = Effect.filterOrDie(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => Cause.IllegalArgumentException("random number is negative")
)

// $ExpectType Effect<never, never, number>
const task3 = Effect.filterOrDieMessage(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  "random number is negative"
)

// $ExpectType Effect<never, never, number>
const task4 = Effect.filterOrElse(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => task3
)
