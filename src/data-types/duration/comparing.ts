import { Duration } from "effect"

const duration1 = Duration.seconds(30)
const duration2 = Duration.minutes(1)

console.log(Duration.lessThan(duration1, duration2)) // Output: true
console.log(Duration.lessThanOrEqualTo(duration1, duration2)) // Output: true
console.log(Duration.greaterThan(duration1, duration2)) // Output: false
console.log(Duration.greaterThanOrEqualTo(duration1, duration2)) // Output: false
