import { Stream, Effect } from "effect"

const stream = Stream.range(1, 5).pipe(Stream.as(null))

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ null, null, null, null ]
}
*/
