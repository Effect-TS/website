import { Effect } from "effect"

const program = Effect.gen(function* (_) {
  yield* _(Effect.log("start"))
  yield* _(Effect.sleep("2 seconds"))
  yield* _(Effect.interrupt)
  yield* _(Effect.log("done"))
})

Effect.runPromise(program).catch((fiberFailure) =>
  console.log(`interrupted: ${fiberFailure}`)
)
/*
Output:
timestamp=... level=INFO fiber=#0 message=start
interrupted: {
  "_id": "FiberFailure",
  "cause": {
    "_id": "Cause",
    "_tag": "Interrupt",
    "fiberId": {
      "_id": "FiberId",
      "_tag": "Runtime",
      "id": 0,
      "startTimeMillis": ...
    }
  }
}
*/
