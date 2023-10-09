import { Metric } from "effect"

// $ExpectType Counter<number>
const numberCounter = Metric.counter("count", {
  description: "An example counter"
})

// $ExpectType Counter<bigint>
const bigintCounter = Metric.counter("count", {
  description: "An example counter",
  bigint: true
})
