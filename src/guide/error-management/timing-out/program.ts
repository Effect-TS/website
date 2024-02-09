import { Effect } from "effect"

// $ExpectType Effect<string, never, never>
const program = Effect.gen(function* (_) {
  console.log("start doing something...")
  yield* _(Effect.sleep("2 seconds"))
  console.log("my job is finished!")
  return "some result"
})

// $ExpectType Effect<string, TimeoutException, never>
const main = program.pipe(Effect.timeout("3 seconds"))
