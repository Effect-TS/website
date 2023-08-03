import { Effect } from "effect"
import * as Queries from "./Queries"

const program = Effect.gen(function* (_) {
  const todos = yield* _(Queries.getTodos)
  yield* _(
    Effect.forEach(todos, (todo) => Queries.notifyOwner(todo), {
      concurrency: "unbounded"
    })
  )
})

const nextStep = Effect.flatMapStep(program, (step) => {
  switch (step._tag) {
    // the program is blocked on a number of requests
    case "Blocked": {
      const requests = step.i0
      const continuation = step.i1
      return shipRequestsToBeExecutedAndWait(requests).pipe(
        Effect.flatMap(() => continuation)
      )
    }
    // the program completed
    case "Success":
    case "Failure": {
      return step
    }
  }
})

const shipRequestsToBeExecutedAndWait = <R, E, A>(
  requests: Effect.Blocked<R, E, A>["i0"]
): Effect.Effect<R, E, void> => {
  // go on mars and come back
  return Effect.unit
}
