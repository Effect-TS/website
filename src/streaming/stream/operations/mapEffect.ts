import { Stream, Random, Effect } from "effect"

const stream = Stream.make(10, 20, 30).pipe(
  Stream.mapEffect((n) => Random.nextIntBetween(0, n))
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 6, 13, 5 ]
}
*/
