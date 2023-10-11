import { Metric, Effect, Console } from "effect"

// Create a counter named 'countAll' and increment it by 1 every time it's invoked
const countAll = Metric.counter("countAll").pipe(Metric.withConstantInput(1))

// $ExpectType Effect<never, never, number>
const task1 = Effect.succeed(1).pipe(Effect.delay("100 millis"))
const task2 = Effect.succeed(2).pipe(Effect.delay("200 millis"))

const program = Effect.gen(function* (_) {
  const a = yield* _(
    // $ExpectType Effect<never, never, number>
    countAll(task1)
  )
  const b = yield* _(countAll(task2))
  return a + b
})

const showMetric = Metric.value(countAll).pipe(Effect.flatMap(Console.log))

Effect.runPromise(program.pipe(Effect.tap(() => showMetric))).then(console.log)
/*
Output:
CounterState {
  count: 2,
  ...
}
3
*/
