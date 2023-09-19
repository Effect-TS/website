import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<never, never, HashMap<number, number>>
const effect = Stream.make(1, 3, 2, 3, 1, 5, 1).pipe(
  Stream.run(
    Sink.collectAllToMapN(
      3,
      (n) => n,
      (a, b) => a + b
    )
  )
)

Effect.runPromise(effect).then(console.log)
/*
Output:
{
  _id: "HashMap",
  values: [
    [ 1, 2 ], [ 2, 2 ], [ 3, 6 ]
  ]
}
*/
