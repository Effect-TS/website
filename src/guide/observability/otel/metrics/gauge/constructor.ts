import { Metric } from "effect"

// $ExpectType Gauge<number>
const numberGauge = Metric.gauge("count", {
  description: "An example gauge"
})

// $ExpectType Gauge<bigint>
const bigintGauge = Metric.gauge("count", {
  description: "An example gauge",
  bigint: true
})
