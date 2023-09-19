import { Stream, Effect, Console } from "effect"

// $ExpectType Effect<never, never, void>
const effect = Stream.make(1, 2, 3).pipe(
  Stream.runForEach((n) => Console.log(n))
)

Effect.runPromise(effect).then(console.log)
/*
Output:
1
2
3
undefined
*/
