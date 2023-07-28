import { Effect } from "effect"
import * as API from "./API"

// $ExpectType Effect<never, GetTodosError | GetUserError | SendEmailError, void>
const program = Effect.gen(function* (_) {
  const todos = yield* _(API.getTodos)
  yield* _(
    Effect.forEach(todos, (todo) => API.notifyOwner(todo), {
      concurrency: "unbounded",
    })
  )
})
