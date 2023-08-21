import { Effect } from "effect"

const program = Effect.log("start").pipe(
  Effect.flatMap(() => Effect.sleep("2 seconds")),
  Effect.flatMap(() => Effect.interrupt),
  Effect.flatMap(() => Effect.log("done"))
)

Effect.runPromise(program).catch((error) =>
  console.log(`interrupted: ${error}`)
)
/*
Output:
timestamp=... level=INFO fiber=#0 message=start
interrupted: All fibers interrupted without errors.
*/
