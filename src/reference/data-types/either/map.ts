import { Either } from "effect"

const foo = Either.map(Either.right(42), (n) => n + 1)
console.log(foo)
/*
Output:
{
  _id: "Either",
  _tag: "Right",
  right: 43
}
*/

const bar = Either.map(Either.left("not a number"), (n) => n + 1)
console.log(bar)
/*
Output:
{
  _id: "Either",
  _tag: "Left",
  left: "not a number"
}
*/
