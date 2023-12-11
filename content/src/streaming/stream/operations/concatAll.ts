import { Stream, Effect, Chunk } from "effect"

const s1 = Stream.make(1, 2, 3)
const s2 = Stream.make(4, 5)
const s3 = Stream.make(6, 7, 8)

const stream = Stream.concatAll(Chunk.make(s1, s2, s3))

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 2, 3, 4, 5, 6, 7, 8 ]
}
*/
