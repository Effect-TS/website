import { Equal, Data } from "effect"

const alice = Data.struct({ name: "Alice", age: 30 })
const bob = Data.struct({ name: "Bob", age: 40 })

const persons = Data.array([alice, bob])

console.log(
  Equal.equals(
    persons,
    Data.array([
      Data.struct({ name: "Alice", age: 30 }),
      Data.struct({ name: "Bob", age: 40 }),
    ])
  )
) // Output: true
