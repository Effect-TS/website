import { Effect, FileSystem, Schema } from "effect"

// An action, or the poll of an interval rule, that did not happen. `status`
// is an answer outside 2xx, `io` a file that could not be written or a
// request that got no answer at all.
export class ActionFailed extends Schema.TaggedError<ActionFailed>()("ActionFailed", {
  reason: Schema.Literals(["status", "io"]),
  message: Schema.String
}) {}

// Appends one line to a local file, creating the file when it is missing.
export const appendLine = Effect.fn("appendLine")(function*(path: string, line: string) {
  const fs = yield* FileSystem.FileSystem
  yield* fs.writeFileString(path, `${line}\n`, { flag: "a" }).pipe(
    Effect.mapError((error) => new ActionFailed({ reason: "io", message: error.message }))
  )
})
