import { Order, ReadonlyArray } from "effect"

// Define the Person interface
interface Person {
  readonly name: string
  readonly age: number
}

// Create a custom sorting rule to sort Persons by their names in ascending order
const byName = Order.mapInput(Order.string, (person: Person) => person.name)

const persons: ReadonlyArray<Person> = [
  { name: "Charlie", age: 22 },
  { name: "Alice", age: 25 },
  { name: "Bob", age: 30 }
]

// Use your custom sorting rule to sort the persons array
const sortedPersons = ReadonlyArray.sort(persons, byName)

console.log(sortedPersons)
/*
Output:
[
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 22 }
]
*/
