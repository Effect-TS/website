import { Effect, Data } from "effect"

class MyError extends Data.Error<{ message: string }> {}

// $ExpectType Effect<void, MyError, never>
export const program = Effect.gen(function* (_) {
  yield* _(new MyError({ message: "Oh no!" })) // same as yield* _(Effect.fail(new MyError({ message: "Oh no!" })))
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
    failure: MyError: "Oh no!
      at ...
  }
}
*/
