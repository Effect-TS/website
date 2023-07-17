import { Effect } from "effect"

const success: Effect.Effect<never, Error, number> = Effect.succeed(42)
const failure: Effect.Effect<never, Error, number> = Effect.fail(
  new Error("Uh oh!")
)

// $ExpectType Effect<never, never, string>
const program1 = success.pipe(
  Effect.matchEffect({
    onFailure: (error) =>
      Effect.succeed(`failure: ${error.message}`).pipe(Effect.tap(Effect.log)),
    onSuccess: (value) =>
      Effect.succeed(`success: ${value}`).pipe(Effect.tap(Effect.log)),
  })
)
console.log(Effect.runSync(program1))
/*
... message="success: 42"
success: 42
*/

// $ExpectType Effect<never, never, string>
const program2 = failure.pipe(
  Effect.matchEffect({
    onFailure: (error) =>
      Effect.succeed(`failure: ${error.message}`).pipe(Effect.tap(Effect.log)),
    onSuccess: (value) =>
      Effect.succeed(`success: ${value}`).pipe(Effect.tap(Effect.log)),
  })
)
console.log(Effect.runSync(program2))
/*
... message="failure: Uh oh!"
failure: Uh oh!
*/
