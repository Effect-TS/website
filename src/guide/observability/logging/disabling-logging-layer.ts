import { Effect, Logger, LogLevel } from "effect"

const program = Effect.gen(function* (_) {
  yield* _(Effect.log("Executing task..."))
  yield* _(Effect.sleep("100 millis"))
  console.log("task done")
})

const layer = Logger.minimumLogLevel(LogLevel.None)

// Logging disabled using a layer
Effect.runPromise(program.pipe(Effect.provide(layer)))
/*
Output:
task done
*/
