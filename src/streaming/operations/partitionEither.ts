import { Stream, Effect, Either } from "effect"

const partition = Stream.range(1, 10).pipe(
  Stream.partitionEither(
    (n) => Effect.succeed(n < 5 ? Either.left(n * 2) : Either.right(n)),
    { bufferSize: 5 }
  )
)

Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* (_) {
      const [evens, odds] = yield* _(partition)
      console.log(yield* _(Stream.runCollect(evens)))
      console.log(yield* _(Stream.runCollect(odds)))
    })
  )
)
/*
Output:
{
  _id: "Chunk",
  values: [ 2, 4, 6, 8 ]
}
{
  _id: "Chunk",
  values: [ 5, 6, 7, 8, 9 ]
}
*/
