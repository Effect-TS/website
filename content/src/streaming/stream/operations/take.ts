import { Stream, Effect } from "effect"

const stream = Stream.iterate(0, (n) => n + 1)

// Using `take` to extract a fixed number of elements:
const s1 = Stream.take(stream, 5)
Effect.runPromise(Stream.runCollect(s1)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 0, 1, 2, 3, 4 ]
}
*/

// Using `takeWhile` to extract elements until a certain condition is met:
const s2 = Stream.takeWhile(stream, (n) => n < 5)
Effect.runPromise(Stream.runCollect(s2)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 0, 1, 2, 3, 4 ]
}
*/

// Using `takeUntil` to extract elements until a specific condition is met:
const s3 = Stream.takeUntil(stream, (n) => n === 5)
Effect.runPromise(Stream.runCollect(s3)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 0, 1, 2, 3, 4, 5 ]
}
*/

// Using `takeRight` to extract a specified number of elements from the end:
const s4 = Stream.takeRight(s3, 3)
Effect.runPromise(Stream.runCollect(s4)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 3, 4, 5 ]
}
*/
