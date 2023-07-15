import { Effect } from "effect"

// Effect<never, never, number>
const program = Effect.promise(
  () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve("Async operation completed successfully!")
      }, 2000)
    })
)
