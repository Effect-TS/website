import { Effect } from "effect"

const program = Effect.logInfo("start").pipe(
  Effect.flatMap(() => Effect.sleep("2 seconds")),
  Effect.flatMap(() => Effect.sleep("1 seconds")),
  Effect.flatMap(() => Effect.logInfo("done"))
)

Effect.runPromise(program)
/*
...more infos... level=INFO message=start
... 3 seconds ...
...more infos... level=INFO message=done
*/
