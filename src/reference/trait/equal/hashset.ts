import { HashSet, Data } from "effect"

const set = HashSet.empty().pipe(
  HashSet.add(Data.struct({ name: "Alice", age: 30 })),
  HashSet.add(Data.struct({ name: "Alice", age: 30 }))
)

console.log(HashSet.size(set)) // Output: 1
