import { Effect } from "effect"

// $ExpectType Effect<number, never, never>
const program = Effect.sync(() => {
  console.log("Hello, World!") // side effect
  return 42 // return value
})
