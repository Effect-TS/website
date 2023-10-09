import { Metric, Effect, Random } from "effect"

const temperature = Metric.gauge("temperature")

const getTemperature = Effect.gen(function* (_) {
  const n = yield* _(Random.nextIntBetween(-10, 10))
  console.log(`variation: ${n}`)
  return n
})

const program = Effect.gen(function* (_) {
  const series: Array<number> = []
  series.push(yield* _(getTemperature.pipe(temperature)))
  series.push(yield* _(getTemperature.pipe(temperature)))
  series.push(yield* _(getTemperature.pipe(temperature)))
  console.log(yield* _(Metric.value(temperature)))
  return series
})

Effect.runPromise(program).then(console.log)
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
