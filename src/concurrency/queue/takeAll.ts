import { Effect, Queue } from "effect"

// $ExpectType Effect<never, never, Chunk<number>>
const polled = Effect.gen(function* (_) {
  const queue = yield* _(Queue.bounded<number>(100))
  yield* _(Queue.offer(queue, 10))
  yield* _(Queue.offer(queue, 20))
  yield* _(Queue.offer(queue, 30))
  const chunk = yield* _(Queue.takeAll(queue))
  return chunk
})

Effect.runPromise(polled).then(console.log)
/*
Output:
{
  _id: "Chunk",
  values: [ 10, 20, 30 ]
}
*/
