import { Stream, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.intersperseAffixes({
    start: "[",
    middle: "-",
    end: "]"
  })
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ "[", 1, "-", 2, "-", 3, "-", 4, "-", 5, "]" ]
}
*/
