import { Metric } from "effect"

// $ExpectType Counter<number>
const numberCounter = Metric.counter("request_count", {
  description: "A counter for tracking requests"
})

// $ExpectType Counter<bigint>
const bigintCounter = Metric.counter("error_count", {
  description: "A counter for tracking errors",
  bigint: true
})

const incrementalCounter = Metric.counter("count", {
  description: "a counter that only increases its value",
  incremental: true
})
