import { Equal } from "effect"
import { Person } from "./Person"

const alice = new Person("Alice", 30)
const bob = new Person("Bob", 40)

console.log(Equal.equals(alice, alice)) // Output: true
console.log(Equal.equals(alice, new Person("Alice", 30))) // Output: true

console.log(Equal.equals(alice, bob)) // Output: false
