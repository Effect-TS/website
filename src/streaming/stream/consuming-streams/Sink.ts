import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<never, never, number>
const effect = Stream.make(1, 2, 3).pipe(Stream.run(Sink.sum))

Effect.runPromise(effect).then(console.log) // Output: 6
