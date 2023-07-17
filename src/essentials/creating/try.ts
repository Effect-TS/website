import { Effect } from "effect"

// $ExpectType Effect<never, never, number>
const program = Effect.sync(() => {
  console.log("Hello, World!") // side effect
  return 42 // return value
})
