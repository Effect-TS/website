import { Stream, Sink, Effect } from "effect"

// Convert its input to integers, do the computation and then convert them back to a string
const sumSink = Sink.sum.pipe(
  Sink.dimap({
    onInput: (s: string) => Number.parseFloat(s),
    onDone: (n) => String(n)
  })
)

Effect.runPromise(
  Stream.make("1", "2", "3", "4", "5").pipe(Stream.run(sumSink))
).then(console.log)
/*
Output:
15 <-- as string
*/
