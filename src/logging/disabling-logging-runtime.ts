import { Effect, Logger, LogLevel, Runtime, Layer } from "effect"

const program = Effect.gen(function* (_) {
  yield* _(Effect.log("Executing task..."))
  yield* _(Effect.sleep("100 millis"))
  console.log("task done")
})

const customRuntime = Effect.runSync(
  Effect.scoped(Layer.toRuntime(Logger.minimumLogLevel(LogLevel.None)))
)

// Logging disabled using a custom runtime
const customRunPromise = Runtime.runPromise(customRuntime)

customRunPromise(program)
/*
Output:
task done
*/
