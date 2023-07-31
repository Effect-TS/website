import { Effect } from "effect"

const program = Effect.gen(function* (_) {
  yield* _(Effect.logInfo("start"))
  yield* _(Effect.sleep("2 seconds"))
  yield* _(Effect.sleep("1 seconds"))
  yield* _(Effect.logInfo("done"))
})

Effect.runPromise(program)
/*
...more infos... level=INFO message=start
... 3 seconds ...
...more infos... level=INFO message=done
*/
