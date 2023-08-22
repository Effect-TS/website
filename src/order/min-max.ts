import { Order } from "effect"

console.log(Order.min(Order.number)(3, 1)) // Output: 1 (1 is the minimum)
console.log(Order.max(Order.number)(5, 8)) // Output: 8 (8 is the maximum)
