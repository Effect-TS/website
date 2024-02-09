import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<void, never, never>
const effect = Stream.make(1, 2, 3, 4).pipe(Stream.run(Sink.drain))

Effect.runPromise(effect).then(console.log)
/*
Output:
undefined
*/
