import { Effect, Schedule } from "effect"
import * as Queries from "./Queries"

// $ExpectType Effect<never, GetTodosError | GetUserError | SendEmailError, number>
const program = Queries.getTodos.pipe(
  Effect.flatMap((todos) =>
    Effect.forEach(todos, Queries.notifyOwner, {
      concurrency: "unbounded",
      discard: true,
    })
  ),
  Effect.repeat(Schedule.fixed("10 seconds"))
)
