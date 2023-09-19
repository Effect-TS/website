import { Stream, Effect, Chunk, Option, StreamEmit } from "effect"

const events = [1, 2, 3, 4]

const stream = Stream.async(
  (emit: StreamEmit.Emit<never, never, number, void>) => {
    events.forEach((n) => {
      setTimeout(() => {
        if (n === 3) {
          emit(Effect.fail(Option.none())) // Terminate the stream
        } else {
          emit(Effect.succeed(Chunk.of(n))) // Add the current item to the stream
        }
      }, 100 * n)
    })
  }
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 2 ]
}
*/
