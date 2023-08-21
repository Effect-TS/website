import { Effect, Logger, LoggerLevel } from "effect"

const task1 = Effect.gen(function* (_) {
  yield* _(Effect.sleep("2 seconds"))
  yield* _(Effect.logDebug("task1 done"))
}).pipe(Logger.withMinimumLogLevel(LoggerLevel.Debug))

const task2 = Effect.gen(function* (_) {
  yield* _(Effect.sleep("1 seconds"))
  yield* _(Effect.logDebug("task2 done"))
})

const program = Effect.gen(function* (_) {
  yield* _(Effect.log("start"))
  yield* _(task1)
  yield* _(task2)
  yield* _(Effect.log("done"))
})

Effect.runPromise(program)
/*
Output:
... level=INFO message=start
... level=DEBUG message="task1 done" <-- 2 seconds later
... level=INFO message=done <-- 1 second later
*/
