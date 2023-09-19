import { Stream, Effect } from "effect"

const stream = Stream.range(1, 6).pipe(Stream.scan(0, (a, b) => a + b))

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 0, 1, 3, 6, 10, 15 ]
}
*/
