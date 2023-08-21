import { Effect, Logger, LoggerLevel } from "effect"

const task1 = Effect.sleep("2 seconds").pipe(
  Effect.flatMap(() => Effect.logDebug("task1 done")),
  Logger.withMinimumLogLevel(LoggerLevel.Debug)
)

const task2 = Effect.sleep("1 seconds").pipe(
  Effect.flatMap(() => Effect.logDebug("task2 done"))
)

const program = Effect.log("start").pipe(
  Effect.flatMap(() => task1),
  Effect.flatMap(() => task2),
  Effect.flatMap(() => Effect.log("done"))
)

Effect.runPromise(program)
/*
Output:
... level=INFO message=start
... level=DEBUG message="task1 done" <-- 2 seconds later
... level=INFO message=done <-- 1 second later
*/
