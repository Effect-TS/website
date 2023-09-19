import { Stream, Sink, Effect } from "effect"

// $ExpectType Sink<never, never, number, never, number>
const numericSum = Sink.sum

// $ExpectType Sink<never, never, string, never, number>
const stringSum = numericSum.pipe(
  Sink.contramap((s: string) => Number.parseFloat(s))
)

Effect.runPromise(
  Stream.make("1", "2", "3", "4", "5").pipe(Stream.run(stringSum))
).then(console.log)
/*
Output:
15
*/
