import { Effect } from "effect"

// Effect<never, unknown, Response>
const program = Effect.tryPromise(() =>
  fetch("https://jsonplaceholder.typicode.com/todos/1")
)
