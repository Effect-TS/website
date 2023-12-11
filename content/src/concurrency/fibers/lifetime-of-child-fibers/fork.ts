import { Effect, Console, Schedule } from "effect"

const barJob = Effect.repeat(
  Console.log("Bar: still running!"),
  Schedule.fixed("1 seconds")
)

const fooJob = Effect.gen(function* (_) {
  console.log("Foo: started!")
  yield* _(Effect.fork(barJob))
  yield* _(Effect.sleep("3 seconds"))
  console.log("Foo: finished!")
})

Effect.runPromise(fooJob)
