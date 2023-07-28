import { Effect } from "effect"
import * as Queries from "./Queries"

// $ExpectType Effect<never, GetTodosError | GetUserError | SendEmailError, void>
const program = Queries.getTodos.pipe(
  Effect.flatMap((todos) =>
    Effect.forEach(todos, Queries.notifyOwner, {
      concurrency: "unbounded",
      discard: true,
    })
  ),
  Effect.withRequestBatching(false)
)
