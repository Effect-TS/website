import { HashSet } from "effect"

const set = HashSet.empty().pipe(
  HashSet.add({ name: "Alice", age: 30 }),
  HashSet.add({ name: "Alice", age: 30 })
)

console.log(HashSet.size(set)) // Output: 2
