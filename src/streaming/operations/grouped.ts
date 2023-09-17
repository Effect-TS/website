import { Stream, Effect } from "effect"

// $ExpectType Stream<never, never, Chunk<number>>
const stream = Stream.range(0, 8).pipe(Stream.grouped(3))

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    {
      _id: "Chunk",
      values: [ 0, 1, 2 ]
    }, {
      _id: "Chunk",
      values: [ 3, 4, 5 ]
    }, {
      _id: "Chunk",
      values: [ 6, 7 ]
    }
  ]
}
*/
