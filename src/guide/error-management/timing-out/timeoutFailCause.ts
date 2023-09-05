import { Effect, Cause } from "effect"

// $ExpectType Effect<never, never, string>
const program = Effect.gen(function* (_) {
  console.log("start doing something...")
  yield* _(Effect.sleep("2 seconds"))
  console.log("my job is finished!")
  return "some result"
})

// $ExpectType Effect<never, never, string>
const main = program.pipe(
  Effect.timeoutFailCause({
    duration: "1 seconds",
    onTimeout: () => Cause.die("timeout")
  })
)

Effect.runPromise(main).then(console.log, (e) => console.error("error", e))
/*
Output:
start doing something...
error Error: timeout
*/
