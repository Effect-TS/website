import { Effect } from "effect"

// Effect<never, never, number>
const program = Effect.sync(() => {
  console.log("Hello, World!")
  return 1
})

// number
const result = Effect.runSync(program)
// Output: Hello, World!

console.log(result)
// Output: 1
