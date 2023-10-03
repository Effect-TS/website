import { Effect } from "effect"

const program = Effect.gen(function* ($) {
  const sem = yield* $(Effect.makeSemaphore(5))

  yield* $(
    Effect.forEach(
      [1, 2, 3, 4, 5],
      (n) =>
        sem
          .withPermits(n)(
            Effect.delay(Effect.log(`process: ${n}`), "2 seconds")
          )
          .pipe(Effect.withLogSpan("elasped")),
      { concurrency: "unbounded" }
    )
  )
})

Effect.runPromise(program)
/*
Output:
timestamp=... level=INFO fiber=#1 message="process: 1" elasped=2011ms
timestamp=... level=INFO fiber=#2 message="process: 2" elasped=2017ms
timestamp=... level=INFO fiber=#3 message="process: 3" elasped=4020ms
timestamp=... level=INFO fiber=#4 message="process: 4" elasped=6025ms
timestamp=... level=INFO fiber=#5 message="process: 5" elasped=8034ms
*/
