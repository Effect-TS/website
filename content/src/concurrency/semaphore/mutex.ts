import { Effect } from "effect"

const task = Effect.gen(function* (_) {
  yield* _(Effect.log("start"))
  yield* _(Effect.sleep("2 seconds"))
  yield* _(Effect.log("end"))
})

const semTask = (sem: Effect.Semaphore) => sem.withPermits(1)(task)

const semTaskSeq = (sem: Effect.Semaphore) =>
  [1, 2, 3].map(() => semTask(sem).pipe(Effect.withLogSpan("elapsed")))

const program = Effect.gen(function* (_) {
  const mutex = yield* _(Effect.makeSemaphore(1))
  yield* _(Effect.all(semTaskSeq(mutex), { concurrency: "unbounded" }))
})

Effect.runPromise(program)
/*
Output:
timestamp=... level=INFO fiber=#1 message=start elapsed=3ms
timestamp=... level=INFO fiber=#1 message=end elapsed=2010ms
timestamp=... level=INFO fiber=#2 message=start elapsed=2012ms
timestamp=... level=INFO fiber=#2 message=end elapsed=4017ms
timestamp=... level=INFO fiber=#3 message=start elapsed=4018ms
timestamp=... level=INFO fiber=#3 message=end elapsed=6026ms
*/
