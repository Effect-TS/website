import { Effect, Console, Schedule } from "effect"

const barJob = Effect.repeat(
  Console.log("Bar: still running!"),
  Schedule.fixed("1 seconds")
)

const fooJob = Effect.gen(function* (_) {
  console.log("Foo: started!")
  yield* _(Effect.forkScoped(barJob))
  yield* _(Effect.sleep("3 seconds"))
  console.log("Foo: finished!")
})

const program = Effect.scoped(
  Effect.gen(function* (_) {
    console.log("Local scope started!")
    yield* _(Effect.fork(fooJob))
    yield* _(Effect.sleep("5 seconds"))
    console.log("Leaving the local scope!")
  })
)

Effect.runPromise(program)
