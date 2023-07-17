import { Brand } from "effect"

type Int = number & Brand.Brand<"Int">

const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n), // Check if the value is an integer
  (n) => Brand.error(`Expected ${n} to be an integer`) // Error message if the value is not an integer
)

// Create a value of type Int
const x: Int = Int(3)
console.log(x) // Output: 3

// Attempt to create a value of type Int with a non-integer value
const y: Int = Int(3.14) // Throws an error: [ { message: 'Expected 3.14 to be an integer' } ]

// ✅
const good: Int = Int(3)

// ❌
// @ts-expect-error
const bad1: Int = 3 // Type 'number' is not assignable to type 'Brand<"Int">'
// @ts-expect-error
const bad2: Int = 3.14 // Type 'number' is not assignable to type 'Brand<"Int">'
