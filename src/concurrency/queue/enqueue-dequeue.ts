import { Queue, Effect } from "effect"

const send = (offerOnlyQueue: Queue.Enqueue<number>, value: number) => {
  // This enqueue can only be used to offer values

  // @ts-expect-error
  Queue.take(offerOnlyQueue)

  // Ok
  return Queue.offer(offerOnlyQueue, value)
}

const receive = (takeOnlyQueue: Queue.Dequeue<number>) => {
  // This dequeue can only be used to take values

  // @ts-expect-error
  Queue.offer(takeOnlyQueue, 1)

  // Ok
  return Queue.take(takeOnlyQueue)
}

const program = Effect.gen(function* (_) {
  const queue = yield* _(Queue.unbounded<number>())

  // Offer values to the queue
  yield* _(send(queue, 1))
  yield* _(send(queue, 2))

  // Take values from the queue
  console.log(yield* _(receive(queue)))
  console.log(yield* _(receive(queue)))
})

Effect.runPromise(program)
/*
Output:
1
2
*/
