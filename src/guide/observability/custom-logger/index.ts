import { Effect, Logger, LoggerLevel } from "effect"
import * as CustomLogger from "./CustomLogger"
import { program } from "./program"

// $ExpectType Layer<never, never, never>
const layer = Logger.replace(Logger.defaultLogger, CustomLogger.logger)

Effect.runPromise(
  Effect.provideLayer(
    Logger.withMinimumLogLevel(program, LoggerLevel.Debug),
    layer
  )
)
