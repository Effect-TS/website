import { Data } from "effect"

interface Person {
  readonly _tag: "Person" // the tag
  readonly name: string
}

const Person = Data.case<Person>()

// It can be quite frustrating to repeat `_tag: 'Person'` every time...
const mike = Person({ _tag: "Person", name: "Mike" })
const john = Person({ _tag: "Person", name: "John" })
