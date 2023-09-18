import { Stream, Effect } from "effect"

const stream = Stream.fromEffect(Effect.never).pipe(Stream.timeout("2 seconds"))

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
{
  _id: "Chunk",
  values: []
}
*/
