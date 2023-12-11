import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<never, never, Chunk<number>>
const effect = Stream.make(1, 2, 3, 4, 5).pipe(Stream.run(Sink.collectAllN(3)))

Effect.runPromise(effect).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 2, 3 ]
}
*/
