import { Logger, Effect } from "effect"

// Define a configuration layer
const addSimpleLogger = Logger.replace(
  Logger.defaultLogger,
  Logger.make(({ message }) => console.log(message))
)

const program = Effect.gen(function* (_) {
  yield* _(Effect.log("Application started!"))
  yield* _(
    Effect.gen(function* (_) {
      yield* _(Effect.log("I'm not going to be logged!"))
      yield* _(
        Effect.log("I will be logged by the simple logger.").pipe(
          Effect.provide(addSimpleLogger)
        )
      )
      yield* _(
        Effect.log(
          "Reset back to the previous configuration, so I won't be logged."
        )
      )
    }).pipe(Effect.provide(Logger.remove(Logger.defaultLogger)))
  )
  yield* _(Effect.log("Application is about to exit!"))
})

Effect.runSync(program)
/*
Output:
timestamp=... level=INFO fiber=#0 message="Application started!"
I will be logged by the simple logger.
timestamp=... level=INFO fiber=#0 message="Application is about to exit!"
*/
