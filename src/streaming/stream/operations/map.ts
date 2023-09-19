import { Stream, Effect } from "effect"

const stream = Stream.make(1, 2, 3).pipe(Stream.map((n) => n + 1))

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 2, 3, 4 ]
}
*/
