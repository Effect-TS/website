import { Stream, Effect } from "effect"

const s1 = Stream.zipAll(Stream.make(1, 2, 3, 4, 5, 6), {
  other: Stream.make("a", "b", "c"),
  defaultSelf: 0,
  defaultOther: "x"
})

Effect.runPromise(Stream.runCollect(s1)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    [ 1, "a" ], [ 2, "b" ], [ 3, "c" ], [ 4, "x" ], [ 5, "x" ], [ 6, "x" ]
  ]
}
*/

const s2 = Stream.zipAllWith(Stream.make(1, 2, 3, 4, 5, 6), {
  other: Stream.make("a", "b", "c"),
  onSelf: (n) => [n, "x"],
  onOther: (s) => [0, s],
  onBoth: (n, s) => [n - s.length, s]
})

Effect.runPromise(Stream.runCollect(s2)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    [ 0, "a" ], [ 1, "b" ], [ 2, "c" ], [ 4, "x" ], [ 5, "x" ], [ 6, "x" ]
  ]
}
*/
