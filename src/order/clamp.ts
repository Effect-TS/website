import { Order } from "effect"

const clampedValue = Order.clamp(Order.number)(10, 20, 30)

console.log(clampedValue) // Output: 20 (10 is clamped to the nearest bound, which is 20)
