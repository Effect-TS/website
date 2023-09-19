import { Stream, Sink, Effect } from "effect"

const s1 = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.run(Sink.take<number>(3).pipe(Sink.collectLeftover))
)

Effect.runPromise(s1).then(console.log)
/*
Output:
[
  {
    _id: "Chunk",
    values: [ 1, 2, 3 ]
  }, {
    _id: "Chunk",
    values: [ 4, 5 ]
  }
]
*/

const s2 = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.run(Sink.head<number>().pipe(Sink.collectLeftover))
)

Effect.runPromise(s2).then(console.log)
/*
Output:
[
  {
    _id: "Option",
    _tag: "Some",
    value: 1
  }, {
    _id: "Chunk",
    values: [ 2, 3, 4, 5 ]
  }
]
*/
