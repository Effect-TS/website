import { Data } from "effect"

class Person extends Data.TaggedClass("Person")<{ name: string }> {
  get upperName() {
    return this.name.toUpperCase()
  }
}

const mike = new Person({ name: "Mike" })

console.log(mike.upperName) // Output: MIKE
