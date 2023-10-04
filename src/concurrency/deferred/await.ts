import { Effect, Deferred } from "effect"

// $ExpectType Effect<never, never, Deferred<Error, string>>
const effectDeferred = Deferred.make<Error, string>()

// $ExpectType Effect<never, Error, string>
const effectGet = effectDeferred.pipe(
  Effect.flatMap((deferred) => Deferred.await(deferred))
)
