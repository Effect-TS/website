import { Stream, Effect } from "effect"

// We create two streams and zip them together.
const s1 = Stream.zip(Stream.make(1, 2, 3, 4, 5, 6), Stream.make("a", "b", "c"))

Effect.runPromise(Stream.runCollect(s1)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    [ 1, "a" ], [ 2, "b" ], [ 3, "c" ]
  ]
}
*/

// We create two streams and zip them with custom logic.
const s2 = Stream.zipWith(
  Stream.make(1, 2, 3, 4, 5, 6),
  Stream.make("a", "b", "c"),
  (n, s) => [n - s.length, s]
)

Effect.runPromise(Stream.runCollect(s2)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    [ 0, "a" ], [ 1, "b" ], [ 2, "c" ]
  ]
}
*/
