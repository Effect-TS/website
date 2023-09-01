import { Either } from "effect"

const foo = Either.map(Either.right(42), (n) => n + 1)
console.log(foo)
// Output: right(43)

const bar = Either.map(Either.left("not a number"), (n) => n + 1)
console.log(bar)
// Output: left("not a number")
