import { Data, Effect, Random } from "effect"

class HttpError extends Data.TaggedError("HttpError") {}

class NetworkError extends Data.TaggedError("NetworkError") {}

const program = Effect.gen(function*() {
  const n = yield* Random.next
  if (n < 0.3) {
    // Simulate random HTTP errors
    yield* Effect.logError("Encountered HTTP error")
    yield* Effect.fail(new HttpError())
  }
  if (n < 0.7) {
    // Simulate random network errors
    yield* Effect.logError("Encountered network error")
    yield* Effect.fail(new NetworkError())
  }
  // Simulate successful HTTP response
  return 200
}).pipe(
  Effect.tap((statusCode) => Effect.log(`Status Code: ${statusCode}`)),
  Effect.retry({
    while: (error) => error._tag === "HttpError",
    times: 3
  }),
  Effect.catchAll((error) => Effect.die(error))
)

Effect.runPromise(program).catch(console.error)
