import { Data } from "effect"

class Person extends Data.Class<{ name: string }> {
  get upperName() {
    return this.name.toUpperCase()
  }
}

const mike = new Person({ name: "Mike" })

console.log(mike.upperName) // Output: MIKE
