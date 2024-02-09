import { Effect, Either } from "effect"

// $ExpectType Effect<string, never, never>
const program = Effect.gen(function* (_) {
  console.log("start doing something...")
  yield* _(Effect.sleep("2 seconds"))
  console.log("my job is finished!")
  return "some result"
})

// $ExpectType Effect<Either<string, string>, never, never>
const main = program.pipe(
  Effect.timeoutTo({
    duration: "1 seconds",
    // let's return an Either
    onSuccess: (result): Either.Either<string, string> => Either.right(result),
    onTimeout: (): Either.Either<string, string> => Either.left("timeout!")
  })
)

Effect.runPromise(main).then(console.log)
/*
Output:
start doing something...
{
  _id: "Either",
  _tag: "Left",
  left: "timeout!"
}
*/
