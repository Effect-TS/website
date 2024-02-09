import { Stream, Schedule, Effect } from "effect"

// $ExpectType Stream<Chunk<number>, never, never>
const stream = Stream.range(0, 10).pipe(
  Stream.repeat(Schedule.spaced("1 seconds")),
  Stream.groupedWithin(18, "1.5 seconds"),
  Stream.take(3)
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    {
      _id: "Chunk",
      values: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7 ]
    }, {
      _id: "Chunk",
      values: [ 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
    }, {
      _id: "Chunk",
      values: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7 ]
    }
  ]
}
*/
