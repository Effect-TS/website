import { Duration } from "effect"

console.log(Duration.unsafeToNanos(Duration.millis(100))) // Output: 100000000n
console.log(Duration.unsafeToNanos(Duration.infinity)) // throws "Cannot convert infinite duration to nanos"
