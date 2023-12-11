import { Effect } from "effect"

const program = Effect.log("start").pipe(
  Effect.flatMap(() => Effect.sleep("2 seconds")),
  Effect.flatMap(() => Effect.interrupt),
  Effect.flatMap(() => Effect.log("done"))
)

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
