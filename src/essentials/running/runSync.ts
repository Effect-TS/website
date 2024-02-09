import { Effect } from "effect"

// $ExpectType Effect<number, never, never>
const program = Effect.sync(() => {
  console.log("Hello, World!")
  return 1
})

// $ExpectType number
const result = Effect.runSync(program)
// Output: Hello, World!

console.log(result)
// Output: 1
