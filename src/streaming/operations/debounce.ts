import { Stream, Effect } from "effect"

const stream = Stream.make(1, 2, 3).pipe(
  Stream.concat(Stream.fromEffect(Effect.sleep("500 millis"))),
  Stream.concat(Stream.make(4, 5)),
  Stream.concat(Stream.fromEffect(Effect.sleep("10 millis"))),
  Stream.concat(Stream.make(6)),
  Stream.debounce("100 millis") // Emit only after a pause of at least 100 ms
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 3, 6 ]
}
*/
