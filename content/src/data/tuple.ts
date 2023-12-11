import { Data, Equal } from "effect"

// $ExpectType Data<readonly [string, number]>
const alice = Data.tuple("Alice", 30)

// $ExpectType Data<readonly [string, number]>
const bob = Data.tuple("Bob", 40)

console.log(Equal.equals(alice, alice)) // Output: true
console.log(Equal.equals(alice, Data.tuple("Alice", 30))) // Output: true

console.log(Equal.equals(alice, ["Alice", 30])) // Output: false
console.log(Equal.equals(alice, bob)) // Output: false
