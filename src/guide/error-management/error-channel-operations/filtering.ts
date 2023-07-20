import { Effect, Random, Cause } from "effect"

// $ExpectType Effect<never, string, number>
const program1 = Random.nextRange(-1, 1).pipe(
  Effect.filterOrFail(
    (n) => n >= 0,
    () => "random number is negative"
  )
)

// $ExpectType Effect<never, never, number>
const program2 = Random.nextRange(-1, 1).pipe(
  Effect.filterOrDie(
    (n) => n >= 0,
    () => Cause.IllegalArgumentException("random number is negative")
  )
)

// $ExpectType Effect<never, never, number>
const program3 = Random.nextRange(-1, 1).pipe(
  Effect.filterOrDieMessage((n) => n >= 0, "random number is negative")
)

// $ExpectType Effect<never, never, number>
const program4 = Random.nextRange(-1, 1).pipe(
  Effect.filterOrElse(
    (n) => n >= 0,
    () => program3
  )
)
