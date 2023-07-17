import { Effect } from "effect"

// $ExpectType Effect<never, Error, Response>
const program = Effect.tryPromise({
  try: () => fetch("https://jsonplaceholder.typicode.com/todos/1"),
  catch: (unknown) => new Error(`something went wrong ${unknown}`), // remap the error
})
