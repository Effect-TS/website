import { Data } from "effect"

interface Person extends Data.Case {
  readonly _tag: "Person" // the tag
  readonly name: string
}

const Person = Data.tagged<Person>("Person")

// Now, it's much more convenient...
const mike = Person({ name: "Mike" })
const john = Person({ name: "John" })

console.log(mike._tag) // Output: "Person"
