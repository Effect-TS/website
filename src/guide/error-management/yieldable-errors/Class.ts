import { Effect, Error } from "effect"

class MyError extends Error.Class<{ message: string }> {}

// $ExpectType Effect<never, MyError, void>
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
    failure: {
      message: "Oh no!",
      ...
    }
  }
}
*/
