import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<number, never, never>
const effect = Stream.make(1, 2, 3, 4, 5, 6, 7, 8, 9, 10).pipe(
  Stream.run(Sink.foldUntil(0, 3, (a, b) => a + b))
)

Effect.runPromise(effect).then(console.log)
/*
Output:
6
*/
