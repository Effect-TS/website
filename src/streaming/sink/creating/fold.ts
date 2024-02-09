import { Stream, Sink, Effect } from "effect"

// $ExpectType Effect<number, never, never>
const effect = Stream.iterate(0, (n) => n + 1).pipe(
  Stream.run(
    Sink.fold(
      0,
      (sum) => sum <= 10,
      (a, b) => a + b
    )
  )
)

Effect.runPromise(effect).then(console.log)
/*
Output:
15
*/
