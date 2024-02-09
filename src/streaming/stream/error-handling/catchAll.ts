import { Stream, Effect } from "effect"

// $expectType Stream<never, "Uh Oh!" | "Ouch", number>
const s1 = Stream.make(1, 2, 3).pipe(
  Stream.concat(Stream.fail("Uh Oh!" as const)),
  Stream.concat(Stream.make(4, 5)),
  Stream.concat(Stream.fail("Ouch" as const))
)

// $expectType Stream<never, never, string>
const s2 = Stream.make("a", "b", "c")

// $expectType Stream<never, never, boolean>
const s3 = Stream.make(true, false, false)

const stream = Stream.catchAll(s1, (error): Stream.Stream<string | boolean> => {
  switch (error) {
    case "Uh Oh!":
      return s2
    case "Ouch":
      return s3
  }
})

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 2, 3, "a", "b", "c" ]
}
*/
