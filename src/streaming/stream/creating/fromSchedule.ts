import { Stream, Schedule, Effect } from "effect"

// Emits values every 1 second for a total of 10 emissions
const schedule = Schedule.spaced("1 seconds").pipe(
  Schedule.compose(Schedule.recurs(10))
)

const stream = Stream.fromSchedule(schedule)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
}
*/
