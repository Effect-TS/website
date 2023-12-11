import { Equal } from "effect"

const a = { name: "Alice", age: 30 }
const b = { name: "Alice", age: 30 }

console.log(Equal.equals(a, b)) // Output: false
