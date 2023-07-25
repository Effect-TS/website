import { Either } from "effect"

const foo = Either.right(42)

if (Either.isLeft(foo)) {
  console.log(`The left value is: ${foo.left}`)
} else {
  console.log(`The Right value is: ${foo.right}`)
}
// Output: "The Right value is: 42"
