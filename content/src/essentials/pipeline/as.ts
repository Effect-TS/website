import { pipe, Effect } from "effect"

// $ExpectType Effect<never, never, string>
const program = pipe(Effect.succeed(5), Effect.as("new value"))

Effect.runPromise(program).then(console.log) // Output: "new value"
