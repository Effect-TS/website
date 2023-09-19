import { Stream, Console, Schedule, Effect } from "effect"

const stream = Stream.range(1, 11).pipe(
  Stream.tap((n) => Console.log(`before buffering: ${n}`)),
  Stream.buffer({ capacity: 4 }),
  Stream.tap((n) => Console.log(`after buffering: ${n}`)),
  Stream.schedule(Schedule.spaced("5 seconds"))
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
before buffering: 1
before buffering: 2
before buffering: 3
before buffering: 4
before buffering: 5
before buffering: 6
after buffering: 1
after buffering: 2
before buffering: 7
after buffering: 3
before buffering: 8
after buffering: 4
before buffering: 9
after buffering: 5
before buffering: 10
...
*/
