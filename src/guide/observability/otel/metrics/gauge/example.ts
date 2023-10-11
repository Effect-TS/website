import { Metric, Effect, Random, Console } from "effect"

const temperature = Metric.gauge("temperature")

const getTemperature = Effect.gen(function* (_) {
  const n = yield* _(Random.nextIntBetween(-10, 10))
  console.log(`variation: ${n}`)
  return n
})

const program = Effect.gen(function* (_) {
  const series: Array<number> = []
  series.push(yield* _(temperature(getTemperature)))
  series.push(yield* _(temperature(getTemperature)))
  series.push(yield* _(temperature(getTemperature)))
  return series
})

const showMetric = Metric.value(temperature).pipe(Effect.flatMap(Console.log))

Effect.runPromise(program.pipe(Effect.tap(() => showMetric))).then(console.log)
/*
Output:
variation: 6
variation: -4
variation: -9
GaugeState {
  value: -9,
  ...
}
[ 6, -4, -9 ]
*/
