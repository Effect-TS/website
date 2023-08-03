import { Option } from "effect"

const maybeName = Option.some("John")
const maybeAge = Option.none()

const person = Option.zipWith(maybeName, maybeAge, (name, age) => ({
  name,
  age
}))

console.log(person) // none
