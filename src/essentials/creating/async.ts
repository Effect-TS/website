import { Effect } from "effect"
import * as NodeFS from "node:fs"

// $ExpectType Effect<never, Error, Buffer>
const program = Effect.async<never, Error, Buffer>((resume) => {
  NodeFS.readFile("todos.txt", (error, data) => {
    if (error) {
      resume(Effect.fail(error))
    } else {
      resume(Effect.succeed(data))
    }
  })
})
