import { Metric } from "effect"

// $ExpectType Gauge<number>
const numberGauge = Metric.gauge("memory_usage", {
  description: "A gauge for memory usage"
})

// $ExpectType Gauge<bigint>
const bigintGauge = Metric.gauge("cpu_load", {
  description: "A gauge for CPU load",
  bigint: true
})
