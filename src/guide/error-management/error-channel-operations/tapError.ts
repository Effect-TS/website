import { Effect, Random } from "effect"

// $ExpectType Effect<never, string, number>
const program = Random.nextRange(-1, 1).pipe(
  Effect.filterOrFail(
    (n) => n >= 0,
    () => "random number is negative"
  )
)

// $ExpectType Effect<never, string, number>
const tapping1 = program.pipe(
  Effect.tapError((error) => Effect.log(`failure: ${error}`))
)

// $ExpectType Effect<never, string, number>
const tapping2 = program.pipe(
  Effect.tapBoth({
    onFailure: (error) => Effect.log(`failure: ${error}`),
    onSuccess: (randomNumber) => Effect.log(`random number: ${randomNumber}`),
  })
)
