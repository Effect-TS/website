import { Option } from "effect"

const maybeName = Option.some("John")
const maybeAge = Option.some(25)

const person = Option.zipWith(maybeName, maybeAge, (name, age) => ({
  name,
  age
}))

console.log(person) // some({ name: "John", age: 25 })
