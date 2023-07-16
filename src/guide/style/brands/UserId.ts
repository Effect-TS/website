import { Brand } from "effect"

type UserId = number & Brand.Brand<"UserId">

const UserId = Brand.nominal<UserId>()

// Create a value of type UserId with a valid value
const id1: UserId = UserId(1)
console.log(id1) // Output: 1

// Create another value of type UserId with a different valid value
const id2: UserId = UserId(2)
console.log(id2) // Output: 2

// Attempt to create a value of type UserId with a non-branded number
// @ts-expect-error
const id3: UserId = 3 // Error: Type 'number' is not assignable to type 'Brand<"UserId">'
