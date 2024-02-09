import { Effect } from "effect"

// $ExpectType Effect<string, never, never>
const program = Effect.promise<string>(
  () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve("Async operation completed successfully!")
      }, 2000)
    })
)
