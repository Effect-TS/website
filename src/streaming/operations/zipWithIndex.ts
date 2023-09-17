import { Stream, Effect } from "effect"

const stream = Stream.make("Mary", "James", "Robert", "Patricia")

const indexedStream = Stream.zipWithIndex(stream)

Effect.runPromise(Stream.runCollect(indexedStream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    [ "Mary", 0 ], [ "James", 1 ], [ "Robert", 2 ], [ "Patricia", 3 ]
  ]
}
*/
