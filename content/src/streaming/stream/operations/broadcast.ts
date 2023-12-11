import { Effect, Stream, Console, Schedule, Fiber } from "effect"

const x = Stream.range(1, 21).pipe(
  Stream.tap((n) => Console.log(`Emit ${n} element before broadcasting`)),
  Stream.broadcast(2, 5),
  Stream.flatMap(([first, second]) =>
    Effect.gen(function* (_) {
      const fiber1 = yield* _(
        Stream.runFold(first, 0, (acc, e) => Math.max(acc, e)).pipe(
          Effect.flatMap((max) => Console.log(`Maximum: ${max}`)),
          Effect.fork
        )
      )
      const fiber2 = yield* _(
        second.pipe(
          Stream.schedule(Schedule.spaced("1 seconds")),
          Stream.runForEach((n) => Console.log(`Logging to the Console: ${n}`)),
          Effect.fork
        )
      )
      yield* _(
        Fiber.join(fiber1).pipe(
          Effect.zip(Fiber.join(fiber2), { concurrent: true })
        )
      )
    })
  ),
  Stream.runCollect
)

const numbers = Effect.scoped(x)

Effect.runPromise(numbers).then(console.log)
/*
Output:
Emit 1 element before broadcasting
Emit 2 element before broadcasting
Emit 3 element before broadcasting
Emit 4 element before broadcasting
Emit 5 element before broadcasting
Emit 6 element before broadcasting
Emit 7 element before broadcasting
Emit 8 element before broadcasting
Emit 9 element before broadcasting
Emit 10 element before broadcasting
Emit 11 element before broadcasting
Logging to the Console: 1
Logging to the Console: 2
Logging to the Console: 3
Logging to the Console: 4
Logging to the Console: 5
Emit 12 element before broadcasting
Emit 13 element before broadcasting
Emit 14 element before broadcasting
Emit 15 element before broadcasting
Emit 16 element before broadcasting
Logging to the Console: 6
Logging to the Console: 7
Logging to the Console: 8
Logging to the Console: 9
Logging to the Console: 10
Emit 17 element before broadcasting
Emit 18 element before broadcasting
Emit 19 element before broadcasting
Emit 20 element before broadcasting
Logging to the Console: 11
Logging to the Console: 12
Logging to the Console: 13
Logging to the Console: 14
Logging to the Console: 15
Maximum: 20
Logging to the Console: 16
Logging to the Console: 17
Logging to the Console: 18
Logging to the Console: 19
Logging to the Console: 20
{
  _id: "Chunk",
  values: [ undefined ]
}
*/
