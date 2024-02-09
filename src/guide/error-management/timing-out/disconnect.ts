import { Effect } from "effect"

// $ExpectType Effect<string, never, never>
const program = Effect.gen(function* (_) {
  console.log("start doing something...")
  yield* _(Effect.sleep("2 seconds"))
  console.log("my job is finished!")
  return "some result"
})

// $ExpectType Effect<string, TimeoutException, never>
const main = program.pipe(
  Effect.uninterruptible,
  Effect.disconnect,
  Effect.timeout("1 seconds")
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
    failure: { _tag: 'NoSuchElementException' }
  }
}
my job is finished!
*/
