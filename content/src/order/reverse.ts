import { Order } from "effect"

const ascendingOrder = Order.number
const descendingOrder = Order.reverse(ascendingOrder)

console.log(ascendingOrder(1, 3)) // Output: -1 (1 < 3 in ascending order)
console.log(descendingOrder(1, 3)) // Output: 1 (1 > 3 in descending order)
