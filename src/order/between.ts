import { Order } from "effect"

console.log(Order.between(Order.number)(15, 10, 20)) // Output: true (15 is within the range [10, 20])
console.log(Order.between(Order.number)(5, 10, 20)) // Output: false (5 is outside the range [10, 20])
