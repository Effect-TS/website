import { Effect, Random } from "effect"

// $ExpectType Effect<never, string, number>
const program = Effect.filterOrFail(
  Random.nextRange(-1, 1),
  (n) => n >= 0,
  () => "random number is negative"
)

// $ExpectType Effect<never, string, number>
const tapping1 = Effect.tapError(program, (error) =>
  Effect.log(`failure: ${error}`)
)

// $ExpectType Effect<never, string, number>
const tapping2 = Effect.tapBoth(program, {
  onFailure: (error) => Effect.log(`failure: ${error}`),
  onSuccess: (randomNumber) => Effect.log(`random number: ${randomNumber}`),
})
