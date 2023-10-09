import { Metric, Effect } from "effect"

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
  console.log(yield* _(Metric.value(countAll)))
  return a + b
})

Effect.runPromise(program).then((result) => console.log(`result: ${result}`))
/*
Output:
CounterState {
  count: 2,
  ...
}
result: 3
*/
