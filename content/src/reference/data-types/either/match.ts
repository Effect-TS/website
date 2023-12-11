import { Either } from "effect"

const foo = Either.right(42)

const message = Either.match(foo, {
  onLeft: (left) => `The left value is: ${left}`,
  onRight: (right) => `The Right value is: ${right}`
})

console.log(message) // Output: "The Right value is: 42"
