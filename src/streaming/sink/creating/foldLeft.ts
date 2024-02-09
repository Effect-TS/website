import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<number, never, never>
const effect = Stream.make(1, 2, 3, 4).pipe(
  Stream.run(Sink.foldLeft(0, (a, b) => a + b))
)

Effect.runPromise(effect).then(console.log)
/*
Output:
10
*/
