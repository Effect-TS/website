import { Effect, FileSystem, Schema } from "effect"

// An action that did not happen. `io` is a local file that could not be
// written; later lessons add the reasons of an action over the network.
export class ActionFailed extends Schema.TaggedError<ActionFailed>()("ActionFailed", {
  reason: Schema.Literals(["io"]),
  message: Schema.String
}) {}

// Appends one line to a local file, creating the file when it is missing.
export const appendLine = Effect.fn("appendLine")(function*(path: string, line: string) {
  const fs = yield* FileSystem.FileSystem
  yield* fs.writeFileString(path, `${line}\n`, { flag: "a" }).pipe(
    Effect.mapError((error) => new ActionFailed({ reason: "io", message: error.message }))
  )
})
