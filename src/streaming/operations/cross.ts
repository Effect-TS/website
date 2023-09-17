import { Stream, Effect } from "effect"

const s1 = Stream.make(1, 2, 3)
const s2 = Stream.make("a", "b")

const product = Stream.cross(s1, s2)

Effect.runPromise(Stream.runCollect(product)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    [ 1, "a" ], [ 1, "b" ], [ 2, "a" ], [ 2, "b" ], [ 3, "a" ], [ 3, "b" ]
  ]
}
*/
