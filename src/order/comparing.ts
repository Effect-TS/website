import { Order } from "effect"

console.log(Order.lessThan(Order.number)(1, 2)) // Output: true (1 < 2)
console.log(Order.greaterThan(Order.number)(5, 3)) // Output: true (5 > 3)
console.log(Order.lessThanOrEqualTo(Order.number)(2, 2)) // Output: true (2 <= 2)
console.log(Order.greaterThanOrEqualTo(Order.number)(4, 4)) // Output: true (4 >= 4)
