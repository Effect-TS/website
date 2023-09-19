import { Stream, Schedule, Effect } from "effect"

const s1 = Stream.make(1, 2, 3).pipe(
  Stream.schedule(Schedule.spaced("1 seconds"))
)

const s2 = Stream.make("a", "b", "c", "d").pipe(
  Stream.schedule(Schedule.spaced("500 millis"))
)

const stream = Stream.zipLatest(s1, s2)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    [ 1, "a" ], [ 1, "b" ], [ 2, "b" ], [ 2, "c" ], [ 2, "d" ], [ 3, "d" ]
  ]
}
*/
