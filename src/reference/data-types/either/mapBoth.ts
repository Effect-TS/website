import { Either } from "effect"

const foo = Either.mapBoth(Either.right(42), {
  onLeft: (s) => s + "!",
  onRight: (n) => n + 1
})
console.log(foo)
/*
Output:
{
  _id: "Either",
  _tag: "Right",
  right: 43
}
*/

const bar = Either.mapBoth(Either.left("not a number"), {
  onLeft: (s) => s + "!",
  onRight: (n) => n + 1
})
console.log(bar)
/*
Output:
{
  _id: "Either",
  _tag: "Left",
  left: "not a number!"
}
*/
