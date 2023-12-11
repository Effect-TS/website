import { Effect } from "effect"

// $ExpectType Effect<never, UnknownException, Response>
const program = Effect.tryPromise(() =>
  fetch("https://jsonplaceholder.typicode.com/todos/1")
)
