import { Stream, Console, Effect } from "effect"

const stream = Stream.make(1, 2, 3).pipe(
  Stream.tap((n) => Console.log(`before mapping: ${n}`)),
  Stream.map((n) => n * 2),
  Stream.tap((n) => Console.log(`after mapping: ${n}`))
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
before mapping: 1
after mapping: 2
before mapping: 2
after mapping: 4
before mapping: 3
after mapping: 6
{
  _id: "Chunk",
  values: [ 2, 4, 6 ]
}
*/
