import { Effect, Schedule, Request } from "effect"
import * as Queries from "./Queries"

// $ExpectType Effect<never, GetTodosError | GetUserError | SendEmailError, number>
const program = Effect.gen(function* (_) {
  const todos = yield* _(Queries.getTodos)
  yield* _(
    Effect.forEach(todos, (todo) => Queries.notifyOwner(todo), {
      concurrency: "unbounded"
    })
  )
}).pipe(
  Effect.repeat(Schedule.fixed("10 seconds")),
  Effect.provideSomeLayer(
    Effect.setRequestCache(
      Request.makeCache({ capacity: 256, timeToLive: "60 minutes" })
    )
  )
)
