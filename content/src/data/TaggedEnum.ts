import { Data, Equal } from "effect"

// Define a union type using TaggedEnum
type HttpError = Data.TaggedEnum<{
  InternalServerError: { reason: string }
  NotFound: {}
}>

// Create constructors for specific error types
const { NotFound, InternalServerError } = Data.taggedEnum<HttpError>()

// Create instances of errors
const error1 = InternalServerError({ reason: "test" })
const error2 = InternalServerError({ reason: "test" })
const error3 = NotFound()

// Checking equality
console.log(Equal.equals(error1, error2)) // Output: true
console.log(Equal.equals(error1, error3)) // Output: false

console.log(error1._tag) // Output: "InternalServerError"
console.log(error3._tag) // Output: "NotFound"
