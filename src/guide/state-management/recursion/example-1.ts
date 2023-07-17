import { List } from "effect"

const size = <A>(self: List.List<A>): number => {
  let count = 0
  for (const _ of self) {
    count++
  }
  return count
}

console.log(size(List.make(1, 2, 3))) // Output: 3
