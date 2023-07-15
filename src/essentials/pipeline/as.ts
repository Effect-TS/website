import { pipe, Effect } from "effect"

// Effect<never, never, string>
const program = pipe(Effect.succeed(5), Effect.as("new value"))

console.log(Effect.runSync(program)) // Output: "new value"
