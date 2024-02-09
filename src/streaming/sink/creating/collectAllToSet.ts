import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<HashSet<number>, never, never>
const effect = Stream.make(1, 2, 2, 3, 4, 4).pipe(
  Stream.run(Sink.collectAllToSet())
)

Effect.runPromise(effect).then(console.log)
/*
Output:
{
  _id: "HashSet",
  values: [ 1, 2, 3, 4 ]
}
*/
