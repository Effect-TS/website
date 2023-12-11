import { Effect } from "effect"
import * as Queries from "./Queries"

// $ExpectType Effect<never, GetTodosError | GetUserError | SendEmailError, void>
const program = Effect.gen(function* (_) {
  const todos = yield* _(Queries.getTodos)
  yield* _(
    Effect.forEach(todos, (todo) => Queries.notifyOwner(todo), {
      batching: true
    })
  )
})
