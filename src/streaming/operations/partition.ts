import { Stream, Effect } from "effect"

const partition = Stream.range(1, 10).pipe(
  Stream.partition((n) => n % 2 === 0, { bufferSize: 5 })
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
  values: [ 1, 3, 5, 7, 9 ]
}
*/
