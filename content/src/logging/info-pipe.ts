import { Effect } from "effect"

const program = Effect.logInfo("start").pipe(
  Effect.flatMap(() => Effect.sleep("2 seconds")),
  Effect.flatMap(() => Effect.sleep("1 seconds")),
  Effect.flatMap(() => Effect.logInfo("done"))
)

Effect.runPromise(program)
/*
Output:
... level=INFO message=start
... level=INFO message=done <-- 3 seconds later
*/
