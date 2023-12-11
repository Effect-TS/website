import { Stream, Sink, Effect } from "effect"

// $ExpectType Stream<never, never, Chunk<number>>
const stream = Stream.make(1, -2, 0, 1, 3, -3, 4, 2, 0, 1, -3, 1, 1, 6).pipe(
  Stream.transduce(
    Sink.collectAllN<number>(3).pipe(Sink.filterInput((n) => n > 0))
  )
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    {
      _id: "Chunk",
      values: [ 1, 1, 3 ]
    }, {
      _id: "Chunk",
      values: [ 4, 2, 1 ]
    }, {
      _id: "Chunk",
      values: [ 1, 1, 6 ]
    }, {
      _id: "Chunk",
      values: []
    }
  ]
}
*/
