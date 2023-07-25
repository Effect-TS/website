import { Option } from "effect"

const foo = Option.some(1)

const result = Option.match(foo, {
  onNone: () => "Option is empty",
  onSome: (value) => `Option has a value: ${value}`,
})

console.log(result) // Output: "Option has a value: 1"
