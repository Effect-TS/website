import { Effect } from "effect"

Effect.runPromiseExit(Effect.succeed(1)).then(console.log) // Output: Exit.succeed(1)

Effect.runPromiseExit(Effect.fail("error")).then(console.log) // Output: Exit.fail(...)
