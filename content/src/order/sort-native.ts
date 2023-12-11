import { Order } from "effect"

const strings = ["b", "a", "d", "c"]

strings.sort(Order.string)

console.log(strings) // Output: [ 'a', 'b', 'c', 'd' ]
