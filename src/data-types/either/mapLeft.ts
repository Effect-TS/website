import { Either } from "effect"

const foo = Either.mapLeft(Either.right(42), (s) => s + "!")
console.log(foo)
// Output: right(42)

const bar = Either.mapLeft(Either.left("not a number"), (s) => s + "!")
console.log(bar)
// Output: left("not a number!")
