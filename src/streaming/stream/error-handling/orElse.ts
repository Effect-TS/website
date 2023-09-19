import { Stream, Effect } from "effect"

const s1 = Stream.make(1, 2, 3).pipe(
  Stream.concat(Stream.fail("Oh! Error!")),
  Stream.concat(Stream.make(4, 5))
)

const s2 = Stream.make("a", "b", "c")

// $expectType Stream<never, never, string | number>
const stream = Stream.orElse(s1, () => s2)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 2, 3, "a", "b", "c" ]
}
*/
