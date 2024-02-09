import { Effect, Cause } from "effect"

// $ExpectType Effect<string, never, never>
const program = Effect.gen(function* (_) {
  console.log("start doing something...")
  yield* _(Effect.sleep("2 seconds"))
  console.log("my job is finished!")
  return "some result"
})

// $ExpectType Effect<string, never, never>
const main = program.pipe(
  Effect.timeoutFailCause({
    duration: "1 seconds",
    onTimeout: () => Cause.die("timeout")
  })
)

Effect.runPromise(main).then(console.log, console.error)
/*
Output:
start doing something...
{
  _id: "FiberFailure",
  cause: {
    _id: "Cause",
    _tag: "Die",
    defect: "timeout"
  }
}
*/
