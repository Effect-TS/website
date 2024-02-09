import { Stream, Sink, Chunk, Effect } from "effect"

// $ExpectType Stream<Chunk<number>, never, never>
const stream = Stream.make(3, 2, 4, 1, 5, 6, 2, 1, 3, 5, 6).pipe(
  Stream.transduce(
    Sink.foldWeighted({
      initial: Chunk.empty<number>(),
      maxCost: 3,
      cost: () => 1,
      body: (acc, el) => Chunk.append(acc, el)
    })
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
      values: [ 3, 2, 4 ]
    }, {
      _id: "Chunk",
      values: [ 1, 5, 6 ]
    }, {
      _id: "Chunk",
      values: [ 2, 1, 3 ]
    }, {
      _id: "Chunk",
      values: [ 5, 6 ]
    }
  ]
}
*/
