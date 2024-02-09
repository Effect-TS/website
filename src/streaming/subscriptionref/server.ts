import { Ref, Effect, Stream, Random, SubscriptionRef, Fiber } from "effect"

const server = (ref: Ref.Ref<number>) =>
  Ref.update(ref, (n) => n + 1).pipe(Effect.forever)

const client = (changes: Stream.Stream<number>) =>
  Effect.gen(function* (_) {
    const n = yield* _(Random.nextIntBetween(1, 10))
    const chunk = yield* _(Stream.runCollect(Stream.take(changes, n)))
    return chunk
  })

const program = Effect.gen(function* (_) {
  const ref = yield* _(SubscriptionRef.make(0))
  const serverFiber = yield* _(Effect.fork(server(ref)))
  const clients = new Array(5).fill(null).map(() => client(ref.changes))
  const chunks = yield* _(Effect.all(clients, { concurrency: "unbounded" }))
  yield* _(Fiber.interrupt(serverFiber))
  for (const chunk of chunks) {
    console.log(chunk)
  }
})

Effect.runPromise(program)
/*
Output:
{
  _id: "Chunk",
  values: [ 2, 3, 4 ]
}
{
  _id: "Chunk",
  values: [ 2 ]
}
{
  _id: "Chunk",
  values: [ 2, 3, 4, 5, 6, 7 ]
}
{
  _id: "Chunk",
  values: [ 2, 3, 4 ]
}
{
  _id: "Chunk",
  values: [ 2, 3, 4, 5, 6, 7, 8, 9 ]
}
*/
