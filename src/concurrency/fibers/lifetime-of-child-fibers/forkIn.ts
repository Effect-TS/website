import { Effect, Console, Schedule } from "effect"

const barJob = Effect.repeat(
  Console.log("Still running!"),
  Schedule.fixed("1 seconds")
)

const program = Effect.scoped(
  Effect.gen(function* (_) {
    const scope = yield* _(Effect.scope)
    yield* _(
      Effect.scoped(
        Effect.gen(function* (_) {
          yield* _(Effect.forkIn(barJob, scope))
          yield* _(Effect.sleep("3 seconds"))
          console.log("The innermost scope is about to be closed.")
        })
      )
    )
    yield* _(Effect.sleep("5 seconds"))
    console.log("The outer scope is about to be closed.")
  })
)

Effect.runPromise(program)
