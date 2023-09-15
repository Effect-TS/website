import { Stream, Effect, Chunk, Option } from "effect"

const events = [1, 2, 3, 4]

const stream = Stream.async<never, never, number>((emit) => {
  events.forEach((n) => {
    setTimeout(() => {
      if (n === 3) {
        emit(Effect.fail(Option.none()))
      } else {
        emit(Effect.succeed(Chunk.of(n)))
      }
    }, 100 * n)
  })
})

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 1, 2 ]
}
*/
