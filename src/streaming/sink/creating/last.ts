import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<never, never, Option<number>>
const effect = Stream.make(1, 2, 3, 4).pipe(Stream.run(Sink.last()))

Effect.runPromise(effect).then(console.log)
/*
Output:
{
  _id: "Option",
  _tag: "Some",
  value: 4
}
*/
