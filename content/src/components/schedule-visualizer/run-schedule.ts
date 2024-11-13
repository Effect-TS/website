import {
  Array,
  Duration,
  Effect,
  Fiber,
  Schedule,
  TestClock,
  TestContext
} from "effect"

export const sample = (
  schedule: Schedule.Schedule<any>,
  limit: number
) => {
  return Effect.gen(function* () {
    const output: Array<Duration.Duration> = []

    const fiber = yield* Effect.gen(function* () {
      const now = yield* TestClock.currentTimeMillis
      const previous = Array.reduce(output, Duration.zero, Duration.sum)

      output.push(Duration.subtract(now, previous))
    }).pipe(
      Effect.schedule(
        schedule.pipe(Schedule.intersect(Schedule.recurs(limit)))
      ),
      Effect.fork
    )

    yield* TestClock.adjust(Infinity)
    yield* Fiber.join(fiber)

    return output
  }).pipe(Effect.provide(TestContext.TestContext))
}
