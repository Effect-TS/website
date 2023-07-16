import { Effect } from "effect"

// $ExpectType Effect<never, never, string>
const program = Effect.promise<string>(
  () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve("Async operation completed successfully!")
      }, 2000)
    })
)
