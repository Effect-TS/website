import { Effect } from "effect"

const program = Effect.log("start").pipe(
  Effect.flatMap(() => Effect.sleep("2 seconds")),
  Effect.flatMap(() => Effect.log("done"))
)

Effect.runPromise(program).catch((error) =>
  console.log(`interrupted: ${error}`)
)
/*
timestamp=...646Z level=INFO fiber=#0 message=start
timestamp=...656Z level=INFO fiber=#0 message=done
*/
