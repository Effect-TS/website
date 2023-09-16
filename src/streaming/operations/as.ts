import { Stream, Effect } from "effect"

const numbers = Stream.range(1, 5).pipe(Stream.as(null))

Effect.runPromise(Stream.runCollect(numbers)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ null, null, null, null ]
}
*/
