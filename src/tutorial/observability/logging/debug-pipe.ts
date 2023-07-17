import { Effect, Logger, LoggerLevel } from "effect"

// $ExpectType Effect<never, never, void>
const task1 = Effect.sleep("2 seconds").pipe(
  Effect.flatMap(() => Effect.log("task1 done", "Debug")),
  Logger.withMinimumLogLevel(LoggerLevel.Debug)
)

// $ExpectType Effect<never, never, void>
const task2 = Effect.sleep("1 seconds").pipe(
  Effect.flatMap(() => Effect.log("task2 done", "Debug"))
)

// $ExpectType Effect<never, never, void>
const program = Effect.log("start").pipe(
  Effect.flatMap(() => task1),
  Effect.flatMap(() => task2),
  Effect.flatMap(() => Effect.log("done"))
)

Effect.runPromise(program)
/*
...more infos... level=INFO message=start
... 2 seconds ...
...more infos... level=DEBUG message="task1 done"
... 1 second ...
...more infos... level=INFO message=done
*/
