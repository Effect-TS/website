import { Data, Equal } from "effect"

interface Person {
  readonly name: string
}

// Creating a constructor for the specified Case
const Person = Data.case<Person>()

// Creating instances of Person
const mike1 = Person({ name: "Mike" })
const mike2 = Person({ name: "Mike" })
const john = Person({ name: "John" })

// Checking equality
console.log(Equal.equals(mike1, mike2)) // Output: true
console.log(Equal.equals(mike1, john)) // Output: false
