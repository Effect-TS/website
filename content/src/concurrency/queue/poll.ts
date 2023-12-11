import { Effect, Queue } from "effect"

// $ExpectType Effect<never, never, Option<number>>
const polled = Effect.gen(function* (_) {
  const queue = yield* _(Queue.bounded<number>(100))
  yield* _(Queue.offer(queue, 10))
  yield* _(Queue.offer(queue, 20))
  const head = yield* _(Queue.poll(queue))
  return head
})

Effect.runPromise(polled).then(console.log)
/*
Output:
{
  _id: "Option",
  _tag: "Some",
  value: 10
}
*/
