import { Option } from "effect"

const maybeName = Option.some("John")
const maybeAge = Option.some(25)

const person = Option.zipWith(maybeName, maybeAge, (name, age) => ({
  name,
  age
}))

console.log(person)
/*
Output:
{
  _id: "Option",
  _tag: "Some",
  value: {
    name: "John",
    age: 25
  }
}
*/
