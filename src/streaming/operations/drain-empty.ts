import { Stream, Effect } from "effect"

// We create a stream and immediately drain it.
const s1 = Stream.range(1, 6).pipe(Stream.drain)

Effect.runPromise(Stream.runCollect(s1)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: []
}
*/
