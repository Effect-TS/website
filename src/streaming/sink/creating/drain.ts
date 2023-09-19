import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<never, never, void>
const effect = Stream.make(1, 2, 3, 4).pipe(Stream.run(Sink.drain))

Effect.runPromise(effect).then(console.log)
/*
Output:
undefined
*/
