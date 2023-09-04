import { HashMap, Data } from "effect"

const map = HashMap.empty().pipe(
  HashMap.set(Data.struct({ name: "Alice", age: 30 }), 1),
  HashMap.set(Data.struct({ name: "Alice", age: 30 }), 2)
)

console.log(HashMap.size(map)) // Output: 1

console.log(HashMap.get(map, Data.struct({ name: "Alice", age: 30 }))) // Output: some(2)
