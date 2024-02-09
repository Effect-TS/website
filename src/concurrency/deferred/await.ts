import { Effect, Deferred } from "effect"

// $ExpectType Effect<Deferred<string, Error>, never, never>
const effectDeferred = Deferred.make<string, Error>()

// $ExpectType Effect<string, Error, never>
const effectGet = effectDeferred.pipe(
  Effect.flatMap((deferred) => Deferred.await(deferred))
)
