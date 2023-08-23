import { Data, Equal } from "effect"

// $ExpectType Data<[string, number]>
const alice = Data.tuple("Alice", 30)

// $ExpectType Data<[string, number]>
const bob = Data.tuple("Bob", 40)

console.log(Equal.equals(alice, alice)) // Output: true
console.log(Equal.equals(alice, Data.tuple("Alice", 30))) // Output: true

console.log(Equal.equals(alice, ["Alice", 30])) // Output: false
console.log(Equal.equals(alice, bob)) // Output: false
