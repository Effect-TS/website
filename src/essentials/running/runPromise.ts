import { Effect } from "effect"

Effect.runPromise(Effect.succeed(1)).then(console.log) // Output: 1
