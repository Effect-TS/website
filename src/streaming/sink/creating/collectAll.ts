import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<Chunk<number>, never, never>
const effect = Stream.make(1, 2, 3, 4).pipe(Stream.run(Sink.collectAll()))

Effect.runPromise(effect).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 2, 3, 4 ]
}
*/
