import { Effect, Supervisor, Schedule, Fiber, FiberStatus } from "effect"

const program = Effect.gen(function* (_) {
  const supervisor = yield* _(Supervisor.track)
  const fibFiber = yield* _(
    fib(20).pipe(Effect.supervised(supervisor), Effect.fork)
  )
  const policy = Schedule.spaced("500 millis").pipe(
    Schedule.whileInputEffect((_) =>
      Fiber.status(fibFiber).pipe(
        Effect.map((status) => status !== FiberStatus.done)
      )
    )
  )
  const monitorFiber = yield* _(
    monitorFibers(supervisor).pipe(Effect.repeat(policy), Effect.fork)
  )
  yield* _(Fiber.join(monitorFiber))
  const result = yield* _(Fiber.join(fibFiber))
  console.log(`fibonacci result: ${result}`)
})

const monitorFibers = (
  supervisor: Supervisor.Supervisor<Array<Fiber.RuntimeFiber<any, any>>>
): Effect.Effect<never, never, void> =>
  Effect.gen(function* (_) {
    const fibers = yield* _(supervisor.value())
    console.log(`number of fibers: ${fibers.length}`)
  })

const fib = (n: number): Effect.Effect<never, never, number> =>
  Effect.gen(function* (_) {
    if (n <= 1) {
      return 1
    }
    yield* _(Effect.sleep("500 millis"))
    const fiber1 = yield* _(Effect.fork(fib(n - 2)))
    const fiber2 = yield* _(Effect.fork(fib(n - 1)))
    const v1 = yield* _(Fiber.join(fiber1))
    const v2 = yield* _(Fiber.join(fiber2))
    return v1 + v2
  })

Effect.runPromise(program)
/*
Output:
number of fibers: 0
number of fibers: 2
number of fibers: 6
number of fibers: 14
number of fibers: 30
number of fibers: 62
number of fibers: 126
number of fibers: 254
number of fibers: 510
number of fibers: 1022
number of fibers: 2034
number of fibers: 3795
number of fibers: 5810
number of fibers: 6474
number of fibers: 4942
number of fibers: 2515
number of fibers: 832
number of fibers: 170
number of fibers: 18
number of fibers: 0
fibonacci result: 10946
*/
