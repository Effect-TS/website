import { Effect, Deferred, Exit, Cause } from "effect"

const program = Effect.gen(function* (_) {
  const deferred = yield* _(Deferred.make<string, number>())

  // Completing the Deferred in various ways
  yield* _(Deferred.succeed(deferred, 1).pipe(Effect.fork))
  yield* _(Deferred.complete(deferred, Effect.succeed(2)).pipe(Effect.fork))
  yield* _(Deferred.completeWith(deferred, Effect.succeed(3)).pipe(Effect.fork))
  yield* _(Deferred.done(deferred, Exit.succeed(4)).pipe(Effect.fork))
  yield* _(Deferred.fail(deferred, "5").pipe(Effect.fork))
  yield* _(
    Deferred.failCause(deferred, Cause.die(new Error("6"))).pipe(Effect.fork)
  )
  yield* _(Deferred.die(deferred, new Error("7")).pipe(Effect.fork))
  yield* _(Deferred.interrupt(deferred).pipe(Effect.fork))

  // Awaiting the Deferred to get its value
  const value = yield* _(Deferred.await(deferred))
  return value
})

Effect.runPromise(program).then(console.log, console.error) // Output: 1
