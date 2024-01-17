import { Effect } from "effect"

// $ExpectType Effect<never, never, string>
const program = Effect.gen(function* (_) {
  console.log("start doing something...")
  yield* _(Effect.sleep("2 seconds"))
  console.log("my job is finished!")
  return "some result"
})

// $ExpectType Effect<never, Error, string>
const main = program.pipe(
  Effect.timeoutFail({
    duration: "1 seconds",
    onTimeout: () => new Error("timeout")
  })
)

Effect.runPromise(main).then(console.log, console.error)
/*
Output:
start doing something...
{
  _id: 'FiberFailure',
  cause: {
    _id: 'Cause',
    _tag: 'Fail',
    failure: Error: timeout
    ... stack trace ...
  }
}
*/
