import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<Option<number>, never, never>
const effect = Stream.make(1, 2, 3, 4).pipe(Stream.run(Sink.head()))

Effect.runPromise(effect).then(console.log)
/*
Output:
{
  _id: "Option",
  _tag: "Some",
  value: 1
}
*/
