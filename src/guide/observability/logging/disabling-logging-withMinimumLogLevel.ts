import { Effect, Logger, LogLevel } from "effect"

const program = Effect.gen(function* (_) {
  yield* _(Effect.log("Executing task..."))
  yield* _(Effect.sleep("100 millis"))
  console.log("task done")
})

// Logging enabled (default)
Effect.runPromise(program)
/*
Output:
timestamp=... level=INFO fiber=#0 message="Executing task..."
task done
*/

// Logging disabled using withMinimumLogLevel
Effect.runPromise(program.pipe(Logger.withMinimumLogLevel(LogLevel.None)))
/*
Output:
task done
*/
