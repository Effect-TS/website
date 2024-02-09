import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<Chunk<number>, never, never>
const effect = Stream.make(1, 2, 0, 4, 0, 6, 7).pipe(
  Stream.run(Sink.collectAllWhile((n) => n !== 0))
)

Effect.runPromise(effect).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 2 ]
}
*/
