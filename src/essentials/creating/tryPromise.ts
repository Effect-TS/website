import { Effect } from "effect"

// $ExpectType Effect<Response, UnknownException, never>
const program = Effect.tryPromise(() =>
  fetch("https://jsonplaceholder.typicode.com/todos/1")
)
