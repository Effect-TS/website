import { pipe, Effect } from "effect"

// $ExpectType Effect<string, never, never>
const program = pipe(Effect.succeed(5), Effect.as("new value"))

Effect.runPromise(program).then(console.log) // Output: "new value"
