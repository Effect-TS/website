import { Stream, Effect } from "effect"

const s1 = Stream.make(1, 2, 3).pipe(
  Stream.concat(Stream.fail("Oh! Error!")),
  Stream.concat(Stream.make(4, 5))
)

const s2 = Stream.make("a", "b", "c")

// $expectType Stream<never, never, Either<number, string>>
const stream = Stream.orElseEither(s1, () => s2)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [
    {
      _id: "Either",
      _tag: "Left",
      left: 1
    }, {
      _id: "Either",
      _tag: "Left",
      left: 2
    }, {
      _id: "Either",
      _tag: "Left",
      left: 3
    }, {
      _id: "Either",
      _tag: "Right",
      right: "a"
    }, {
      _id: "Either",
      _tag: "Right",
      right: "b"
    }, {
      _id: "Either",
      _tag: "Right",
      right: "c"
    }
  ]
}
*/
