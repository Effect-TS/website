import { Order, ReadonlyArray } from "effect"

// Define the structure of a person
interface Person {
  readonly name: string
  readonly age: number
}

// Create an Order to sort people by their names
const byName = Order.mapInput(Order.string, (person: Person) => person.name)

// Create an Order to sort people by their ages
const byAge = Order.mapInput(Order.number, (person: Person) => person.age)

// Combine the two Orders to create a complex sorting logic
const byNameAge = Order.combine(byName, byAge)

const result = ReadonlyArray.sort(
  [
    { name: "Bob", age: 20 },
    { name: "Alice", age: 18 },
    { name: "Bob", age: 18 }
  ],
  byNameAge
)

console.log(result)
/*
Output:
[
  { name: 'Alice', age: 18 }, <-- by name
  { name: 'Bob', age: 18 },   <-- by age
  { name: 'Bob', age: 20 }    <-- by age
]
*/
