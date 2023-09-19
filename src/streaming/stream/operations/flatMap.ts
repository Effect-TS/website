import { Stream, Effect } from "effect"

const stream = Stream.make(1, 2, 3).pipe(
  Stream.flatMap((a) => Stream.repeatValue(a).pipe(Stream.take(4)))
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3 ]
}
*/
