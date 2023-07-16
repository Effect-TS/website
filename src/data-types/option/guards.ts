import { Option } from "effect"

const foo = Option.some(1)

console.log(Option.isSome(foo)) // Output: true

if (Option.isNone(foo)) {
  console.log("Option is empty")
} else {
  console.log(`Option has a value: ${foo.value}`)
}
// Output: "Option has a value: 1"
