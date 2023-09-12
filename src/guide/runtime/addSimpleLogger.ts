import { Logger, Effect } from "effect"

const addSimpleLogger = Logger.replace(
  Logger.defaultLogger,
  Logger.make(({ message }) => console.log(message))
)

const program = Effect.gen(function* (_) {
  yield* _(Effect.log("Application started!"))
  yield* _(Effect.log("Application is about to exit!"))
})

Effect.runSync(program)
/*
Output:
timestamp=... level=INFO fiber=#0 message="Application started!"
timestamp=... level=INFO fiber=#0 message="Application is about to exit!"
*/

// Overriding the default logger
Effect.runSync(program.pipe(Effect.provideLayer(addSimpleLogger)))
/*
Output:
Application started!
Application is about to exit!
*/
