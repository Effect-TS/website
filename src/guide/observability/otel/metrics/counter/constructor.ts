import { Metric } from "effect"

// $ExpectType Counter<number>
const numberCounter = Metric.counter("count", {
  description: "A number counter"
})

// $ExpectType Counter<bigint>
const bigintCounter = Metric.counter("count", {
  description: "A bigint counter",
  bigint: true
})

const incrementalCounter = Metric.counter("count", {
  description: "A number counter",
  incremental: true
})
