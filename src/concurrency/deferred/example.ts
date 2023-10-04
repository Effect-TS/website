import { Effect, Deferred, Fiber } from "effect"

const program = Effect.gen(function* (_) {
  const deferred = yield* _(Deferred.make<string, string>())

  // Fiber A: Set the Deferred value after waiting for 1 second
  const sendHelloWorld = Effect.gen(function* (_) {
    yield* _(Effect.sleep("1 seconds"))
    return yield* _(Deferred.succeed(deferred, "hello world"))
  })

  // Fiber B: Wait for the Deferred and print the value
  const getAndPrint = Effect.gen(function* (_) {
    const s = yield* _(Deferred.await(deferred))
    console.log(s)
    return s
  })

  // Run both fibers concurrently
  const fiberA = Effect.runFork(sendHelloWorld)
  const fiberB = Effect.runFork(getAndPrint)

  // Wait for both fibers to complete
  return yield* _(Fiber.join(Fiber.zip(fiberA, fiberB)))
})

Effect.runPromise(program).then(console.log, console.error)
/*
Output:
hello world
[ true, "hello world" ]
*/
