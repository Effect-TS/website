import { Stream, Effect } from "effect"

// $ExpectType Effect<never, never, number>
const e1 = Stream.make(1, 2, 3, 4, 5).pipe(Stream.runFold(0, (a, b) => a + b))

Effect.runPromise(e1).then(console.log) // Output: 15

// $ExpectType Effect<never, never, number>
const e2 = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.runFoldWhile(
    0,
    (n) => n <= 3,
    (a, b) => a + b
  )
)

Effect.runPromise(e2).then(console.log) // Output: 6
