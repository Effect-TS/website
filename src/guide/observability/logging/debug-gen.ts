import { Effect, Logger, LoggerLevel } from "effect"

// $ExpectType Effect<never, never, void>
const task1 = Effect.gen(function* (_) {
  yield* _(Effect.sleep("2 seconds"))
  yield* _(Effect.logDebug("task1 done"))
}).pipe(Logger.withMinimumLogLevel(LoggerLevel.Debug))

// $ExpectType Effect<never, never, void>
const task2 = Effect.gen(function* (_) {
  yield* _(Effect.sleep("1 seconds"))
  yield* _(Effect.logDebug("task2 done"))
})

// $ExpectType Effect<never, never, void>
const program = Effect.gen(function* (_) {
  yield* _(Effect.log("start"))
  yield* _(task1)
  yield* _(task2)
  yield* _(Effect.log("done"))
})

Effect.runPromise(program)
/*
...more infos... level=INFO message=start
... 2 seconds ...
...more infos... level=DEBUG message="task1 done"
... 1 second ...
...more infos... level=INFO message=done
*/
