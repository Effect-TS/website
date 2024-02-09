import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<number, never, never>
const effect = Stream.make(1, 2, 3, 4).pipe(Stream.run(Sink.succeed(0)))

Effect.runPromise(effect).then(console.log)
/*
Output:
0
*/
