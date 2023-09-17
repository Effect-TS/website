import { Stream, Effect } from "effect"

const s1 = Stream.make(1, 2, 3)
const s2 = Stream.make(4, 5)

const stream = Stream.concat(s1, s2)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 2, 3, 4, 5 ]
}
*/
