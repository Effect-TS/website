import { Stream, Console, Effect } from "effect"

const program = Stream.fromEffect(Console.log("Application Logic.")).pipe(
  Stream.concat(Stream.finalizer(Console.log("Finalizing the stream"))),
  Stream.ensuring(
    Console.log("Doing some other works after stream's finalization")
  )
)

Effect.runPromise(Stream.runCollect(program)).then(console.log)
/*
Output:
Application Logic.
Finalizing the stream
Doing some other works after stream's finalization
{
  _id: "Chunk",
  values: [ undefined, undefined ]
}
*/
