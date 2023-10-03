import { Effect, Error, Random } from "effect"

// An error with _tag: "Foo"
class FooError extends Error.TaggedClass("Foo")<{
  message: string
}> {}

// An error with _tag: "Bar"
class BarError extends Error.TaggedClass("Bar")<{
  randomNumber: number
}> {}

// $ExpectType Effect<never, never, string>
export const program = Effect.gen(function* (_) {
  const n = yield* _(Random.next)
  return n > 0.5
    ? "yay!"
    : n < 0.2
    ? yield* _(new FooError({ message: "Oh no!" }))
    : yield* _(new BarError({ randomNumber: n }))
}).pipe(
  Effect.catchTags({
    Foo: (error) => Effect.succeed(`Foo error: ${error.message}`),
    Bar: (error) => Effect.succeed(`Bar error: ${error.randomNumber}`)
  })
)

Effect.runPromise(program).then(console.log, console.error)
/*
Example Output (n < 0.2):
Foo error: Oh no!
*/
