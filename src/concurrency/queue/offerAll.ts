import { Effect, Queue, ReadonlyArray } from "effect"

const program = Effect.gen(function* (_) {
  const queue = yield* _(Queue.bounded<number>(100))
  const items = ReadonlyArray.range(1, 10)
  yield* _(Queue.offerAll(queue, items))
  return yield* _(Queue.size(queue))
})

Effect.runPromise(program).then(console.log) // Output: 10
