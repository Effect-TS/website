import { Effect } from "effect"

const program = Effect.gen(function* (_) {
  yield* _(Effect.logInfo("start"))
  yield* _(Effect.sleep("2 seconds"))
  yield* _(Effect.sleep("1 seconds"))
  yield* _(Effect.logInfo("done"))
})

Effect.runPromise(program)
/*
Output:
... level=INFO message=start
... level=INFO message=done <-- 3 seconds later
*/
