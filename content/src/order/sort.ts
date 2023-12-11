import { Order, ReadonlyArray } from "effect"

const strings = ["b", "a", "d", "c"]

const result = ReadonlyArray.sort(strings, Order.string)

console.log(strings)
console.log(result)
/*
Output:
[ 'b', 'a', 'd', 'c' ]
[ 'a', 'b', 'c', 'd' ]
*/
