import { Effect } from "effect"
import * as NodeFS from "node:fs"

// $ExpectType Effect<Buffer, Error, never>
const program = Effect.async<Buffer, Error>((resume) => {
  NodeFS.readFile("todos.txt", (error, data) => {
    if (error) {
      resume(Effect.fail(error))
    } else {
      resume(Effect.succeed(data))
    }
  })
})
