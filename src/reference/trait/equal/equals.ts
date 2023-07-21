import { Equal } from "effect"

const alice = { name: "Alice", age: 30 }
const bob = { name: "Bob", age: 40 }

console.log(Equal.equals(alice, alice)) // Output: true

console.log(Equal.equals(alice, { name: "Alice", age: 30 })) // Output: false
console.log(Equal.equals(alice, bob)) // Output: false
