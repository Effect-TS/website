import { Effect } from "effect"

// Clicking the "Reset" button will revert the editor back to the original code
Effect.log("Welcome to Effect!").pipe(
  Effect.andThen(Effect.log("Effect is awesome!")),
  Effect.runPromise
)
