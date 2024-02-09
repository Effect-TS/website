import { Effect, Random, Console } from "effect"

// $ExpectType Effect<number, string, never>
const task = Effect.filterOrFail(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => "random number is negative"
)

// $ExpectType Effect<number, string, never>
const tapping1 = Effect.tapError(task, (error) =>
  Console.log(`failure: ${error}`)
)

// $ExpectType Effect<number, string, never>
const tapping2 = Effect.tapBoth(task, {
  onFailure: (error) => Console.log(`failure: ${error}`),
  onSuccess: (randomNumber) => Console.log(`random number: ${randomNumber}`)
})
