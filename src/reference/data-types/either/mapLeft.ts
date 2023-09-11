import { Either } from "effect"

const foo = Either.mapLeft(Either.right(42), (s) => s + "!")
console.log(foo)
/*
Output:
{
  _id: "Either",
  _tag: "Right",
  right: 42
}
*/

const bar = Either.mapLeft(Either.left("not a number"), (s) => s + "!")
console.log(bar)
/*
Output:
{
  _id: "Either",
  _tag: "Left",
  left: "not a number!"
}
*/
