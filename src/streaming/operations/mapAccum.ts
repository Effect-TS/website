import { Stream, Effect } from "effect"

const runningTotal = (
  stream: Stream.Stream<never, never, number>
): Stream.Stream<never, never, number> =>
  stream.pipe(Stream.mapAccum(0, (s, a) => [s + a, s + a]))

// input:  0, 1, 2, 3, 4, 5
Effect.runPromise(Stream.runCollect(runningTotal(Stream.range(0, 6)))).then(
  console.log
)
/*
Output:
{
  _id: "Chunk",
  values: [ 0, 1, 3, 6, 10, 15 ]
}
*/
