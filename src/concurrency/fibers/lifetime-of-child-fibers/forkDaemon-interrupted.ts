import { Effect, Console, Schedule, Fiber } from "effect"

const barJob = Effect.repeat(
  Console.log("Bar: still running!"),
  Schedule.fixed("1 seconds")
)

const fooJob = Effect.gen(function* (_) {
  console.log("Foo: started!")
  yield* _(Effect.forkDaemon(barJob))
  yield* _(Effect.sleep("3 seconds"))
  console.log("Foo: finished!")
}).pipe(Effect.onInterrupt(() => Console.log("Foo: interrupted!")))

const program = Effect.gen(function* (_) {
  const f = yield* _(Effect.fork(fooJob))
  yield* _(Effect.sleep("2 seconds"))
  yield* _(Fiber.interrupt(f))
})

Effect.runPromise(program)
