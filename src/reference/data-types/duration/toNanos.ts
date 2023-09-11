import { Duration } from "effect"

console.log(Duration.toNanos(Duration.millis(100)))
/*
Output:
{
  _id: "Option",
  _tag: "Some",
  value: 100000000n
}
*/
