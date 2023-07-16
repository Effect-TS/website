import { Duration } from "effect"

console.log(Duration.toNanos(Duration.millis(100))) // Output: Some(100000000n)
