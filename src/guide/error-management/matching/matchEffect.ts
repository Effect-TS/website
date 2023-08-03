import { Effect } from "effect"

const success: Effect.Effect<never, Error, number> = Effect.succeed(42)
const failure: Effect.Effect<never, Error, number> = Effect.fail(
  new Error("Uh oh!")
)

// $ExpectType Effect<never, never, string>
const program1 = Effect.matchEffect(success, {
  onFailure: (error) =>
    Effect.succeed(`failure: ${error.message}`).pipe(
      Effect.tap((message) => Effect.log(message))
    ),
  onSuccess: (value) =>
    Effect.succeed(`success: ${value}`).pipe(
      Effect.tap((message) => Effect.log(message))
    )
})

console.log(Effect.runSync(program1))
/*
... message="success: 42"
success: 42
*/

// $ExpectType Effect<never, never, string>
const program2 = Effect.matchEffect(failure, {
  onFailure: (error) =>
    Effect.succeed(`failure: ${error.message}`).pipe(
      Effect.tap((message) => Effect.log(message))
    ),
  onSuccess: (value) =>
    Effect.succeed(`success: ${value}`).pipe(
      Effect.tap((message) => Effect.log(message))
    )
})

console.log(Effect.runSync(program2))
/*
... message="failure: Uh oh!"
failure: Uh oh!
*/
