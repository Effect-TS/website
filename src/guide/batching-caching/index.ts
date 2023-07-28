import { Effect } from "effect"
import * as API from "./API"

// $ExpectType Effect<never, GetTodosError | GetUserError | SendEmailError, void>
const program = API.getTodos.pipe(
  Effect.flatMap((todos) =>
    Effect.forEach(todos, API.notifyOwner, {
      concurrency: "unbounded",
      discard: true,
    })
  )
)
