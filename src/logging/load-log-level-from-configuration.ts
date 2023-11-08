import { Effect, Config, Logger, Layer, ConfigProvider, LogLevel } from "effect"

// Simulate a program with logs
const program = Effect.gen(function* (_) {
  yield* _(Effect.logError("ERROR!"))
  yield* _(Effect.logWarning("WARNING!"))
  yield* _(Effect.logInfo("INFO!"))
  yield* _(Effect.logDebug("DEBUG!"))
})

// Load the log level from the configuration as a layer
const LogLevelLive = Effect.config(Config.logLevel("LOG_LEVEL")).pipe(
  Effect.map((level) => Logger.minimumLogLevel(level)),
  Layer.unwrapEffect
)

// Configure the program with the loaded log level
const configured = Effect.provide(program, LogLevelLive)

// Test the configured program using ConfigProvider.fromMap
const test = Effect.provide(
  configured,
  Layer.setConfigProvider(
    ConfigProvider.fromMap(new Map([["LOG_LEVEL", LogLevel.Warning.label]]))
  )
)

Effect.runPromise(test)
/*
Output:
... level=ERROR fiber=#0 message=ERROR!
... level=WARN fiber=#0 message=WARNING!
*/
