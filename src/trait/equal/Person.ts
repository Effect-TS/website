import { Equal, Hash } from "effect"

export class Person implements Equal.Equal {
  constructor(readonly name: string, readonly age: number) {}

  [Equal.symbol](that: Equal.Equal): boolean {
    if (that instanceof Person) {
      return (
        Equal.equals(this.name, that.name) && Equal.equals(this.age, that.age)
      )
    }
    return false
  }

  [Hash.symbol](): number {
    return this.name.length + this.age
  }
}
