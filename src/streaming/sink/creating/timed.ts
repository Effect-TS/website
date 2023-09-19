import { Stream, Schedule, Sink, Effect } from "effect"

// $ExpectType Effect<never, never, Duration>
const effect = Stream.make(1, 2, 3, 4).pipe(
  Stream.schedule(Schedule.spaced("100 millis")),
  Stream.run(Sink.timed)
)

Effect.runPromise(effect).then(console.log)
/*
Output:
{
  _id: "Duration",
  _tag: "Millis",
  millis: 523
}
*/
