import { Order } from "effect"

console.log(Order.string("apple", "banana")) // Output: -1, as "apple" < "banana"
console.log(Order.number(1, 1)) // Output: 0, as 1 = 1
console.log(Order.bigint(2n, 1n)) // Output: 1, as 2n > 1n
