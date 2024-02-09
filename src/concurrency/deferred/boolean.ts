import { Effect, Deferred } from "effect"

const program = Effect.gen(function* (_) {
  const deferred = yield* _(Deferred.make<number, string>())
  const b1 = yield* _(Deferred.fail(deferred, "oh no!"))
  const b2 = yield* _(Deferred.succeed(deferred, 1))
  return [b1, b2]
})

Effect.runPromise(program).then(console.log) // Output: [ true, false ]
