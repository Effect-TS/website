import { Effect, Deferred } from "effect"

const program = Effect.gen(function* (_) {
  const deferred = yield* _(Deferred.make<number, string>())

  // Polling the Deferred
  // $ExpectType Option<Effect<number, string, never>>
  const done1 = yield* _(Deferred.poll(deferred))

  // Checking if the Deferred is already completed
  const done2 = yield* _(Deferred.isDone(deferred))

  return [done1, done2]
})

Effect.runPromise(program).then(console.log) // Output: [ none(), false ]
