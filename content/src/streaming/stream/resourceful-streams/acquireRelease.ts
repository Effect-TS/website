import { Stream, Console, Effect } from "effect"

// Simulating File operations
const open = (filename: string) =>
  Effect.gen(function* (_) {
    yield* _(Console.log(`Opening ${filename}`))
    return {
      getLines: Effect.succeed(["Line 1", "Line 2", "Line 3"]),
      close: Console.log(`Closing ${filename}`)
    }
  })

const stream = Stream.acquireRelease(
  open("file.txt"),
  (file) => file.close
).pipe(Stream.flatMap((file) => file.getLines))

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
Opening file.txt
Closing file.txt
{
  _id: "Chunk",
  values: [
    [ "Line 1", "Line 2", "Line 3" ]
  ]
}
*/
