import { Stream, Sink, Effect } from "effect"

// $ExpectType Stream<number, never, never>
const stream = Stream.make(1, 2, 3) // Define a stream with numbers 1, 2, and 3

// $ExpectType Sink<number, number, never, never, never>
const sink = Sink.sum // Choose a sink that sums up numbers

// $ExpectType Effect<number, never, never>
const sum = Stream.run(stream, sink) // Run the stream through the sink

Effect.runPromise(sum).then(console.log)
/*
Output:
6
*/
