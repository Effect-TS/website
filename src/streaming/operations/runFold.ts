import { Stream, Effect } from "effect"

const fold = Stream.range(1, 6).pipe(Stream.runFold(0, (a, b) => a + b))

Effect.runPromise(fold).then(console.log) // Output: 15
