import { Effect } from "effect"

const program = Effect.gen(function* (_) {
  yield* _(Effect.log("start"))
  yield* _(Effect.sleep("2 seconds"))
  yield* _(Effect.log("done"))
})

Effect.runPromise(program).catch((error) =>
  console.log(`interrupted: ${error}`)
)
/*
timestamp=... level=INFO fiber=#0 message=start
timestamp=... level=INFO fiber=#0 message=done
*/
