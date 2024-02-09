import { Stream, Sink, Effect } from "effect"

// $ExpectType Sink<number, number, never, never, never>
const numericSum = Sink.sum

// $ExpectType Sink<number, string, never, never, never>
const stringSum = numericSum.pipe(
  Sink.mapInput((s: string) => Number.parseFloat(s))
)

Effect.runPromise(
  Stream.make("1", "2", "3", "4", "5").pipe(Stream.run(stringSum))
).then(console.log)
/*
Output:
15
*/
