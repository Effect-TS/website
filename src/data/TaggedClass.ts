import { Data, Equal } from "effect"

class Person extends Data.TaggedClass("Person")<{ name: string }> {}

// Creating instances of Person
const mike1 = new Person({ name: "Mike" })
const mike2 = new Person({ name: "Mike" })
const john = new Person({ name: "John" })

// Checking equality
console.log(Equal.equals(mike1, mike2)) // Output: true
console.log(Equal.equals(mike1, john)) // Output: false

console.log(mike1._tag) // Output: "Person"
