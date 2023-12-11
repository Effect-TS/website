import { Stream, Effect } from "effect"

// Simulate a chunked stream
const stream = Stream.fromIterable([1, 2, 3, 4, 5]).pipe(Stream.rechunk(2))

const program = Effect.gen(function* (_) {
  // Create an effect to get data chunks from the stream
  const getChunk = yield* _(Stream.toPull(stream))

  // Continuously fetch and process chunks
  while (true) {
    const chunk = yield* _(getChunk)
    console.log(chunk)
  }
})

Effect.runPromise(Effect.scoped(program)).then(console.log, console.error)
/*
Output:
{ _id: 'Chunk', values: [ 1, 2 ] }
{ _id: 'Chunk', values: [ 3, 4 ] }
{ _id: 'Chunk', values: [ 5 ] }
{
  _id: 'FiberFailure',
  cause: {
    _id: 'Cause',
    _tag: 'Fail',
    failure: { _id: 'Option', _tag: 'None' }
  }
}
*/
