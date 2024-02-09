import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<HashMap<number, number>, never, never>
const effect = Stream.make(1, 3, 2, 3, 1, 5, 1).pipe(
  Stream.run(
    Sink.collectAllToMap(
      (n) => n % 3,
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
    [ 0, 6 ], [ 1, 3 ], [ 2, 7 ]
  ]
}
*/
