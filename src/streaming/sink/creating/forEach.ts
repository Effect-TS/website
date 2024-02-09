import { Stream, Sink, Console, Effect } from "effect"

// $ExpectType Effect<void, never, never>
const effect = Stream.make(1, 2, 3, 4).pipe(
  Stream.run(Sink.forEach(Console.log))
)

Effect.runPromise(effect).then(console.log)
/*
Output:
1
2
3
4
undefined
*/
