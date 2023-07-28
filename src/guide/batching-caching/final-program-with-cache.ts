import { Effect, Schedule, Request } from "effect"
import * as Queries from "./Queries"

// $ExpectType Effect<never, GetTodosError | GetUserError | SendEmailError, number>
const program = Queries.getTodos.pipe(
  Effect.flatMap((todos) =>
    Effect.forEach(todos, Queries.notifyOwner, {
      concurrency: "unbounded",
      discard: true,
    })
  ),
  Effect.repeat(Schedule.fixed("10 seconds")),
  Effect.provideSomeLayer(
    Effect.setRequestCache(
      Request.makeCache({ capacity: 256, timeToLive: "60 minutes" })
    )
  )
)
