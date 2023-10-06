import { Effect, Data } from "effect"

class MyError extends Data.Error<{ reason: string }> {}

// $ExpectType Effect<never, MyError, void>
export const program = Effect.gen(function* (_) {
  yield* _(new MyError({ reason: "Oh no!" })) // same as yield* _(Effect.fail(new MyError({ reason: "Oh no!" })))
})

Effect.runPromise(program).then(console.log, console.error)
/*
Output:
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Fail",
    reason: 'Oh no!'
    failure: MyError: {"reason":"Oh no!"}
      at ...
  }
}
*/
