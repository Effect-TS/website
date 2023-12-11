import { Equal, Data } from "effect"

// $ExpectType Data<{ readonly name: string; readonly age: number; }>
const alice = Data.struct({ name: "Alice", age: 30 })

// $ExpectType Data<{ readonly name: string; readonly age: number; }>
const bob = Data.struct({ name: "Bob", age: 40 })

console.log(Equal.equals(alice, alice)) // Output: true
console.log(Equal.equals(alice, Data.struct({ name: "Alice", age: 30 }))) // Output: true

console.log(Equal.equals(alice, { name: "Alice", age: 30 })) // Output: false
console.log(Equal.equals(alice, bob)) // Output: false
