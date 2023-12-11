import { Schedule, Stream, Effect } from "effect"

const s1 = Stream.make("1", "2", "3").pipe(
  Stream.schedule(Schedule.spaced("100 millis"))
)
const s2 = Stream.make(4.1, 5.3, 6.2).pipe(
  Stream.schedule(Schedule.spaced("200 millis"))
)

const stream = Stream.mergeWith(s1, s2, {
  onSelf: (s) => parseInt(s),
  onOther: (n) => Math.floor(n)
})

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 4, 2, 3, 5, 6 ]
}
*/
