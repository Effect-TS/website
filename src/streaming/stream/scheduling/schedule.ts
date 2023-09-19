import { Stream, Schedule, Console, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.schedule(Schedule.spaced("1 seconds")),
  Stream.tap(Console.log)
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
1
2
3
4
5
{
  _id: "Chunk",
  values: [ 1, 2, 3, 4, 5 ]
}
*/
