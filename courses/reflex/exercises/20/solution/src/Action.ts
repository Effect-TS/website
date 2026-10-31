import { Effect, FileSystem, Schema } from "effect"
import { HttpClient, HttpClientRequest } from "effect/http"
import type { HttpPost, Payload } from "./Rule.ts"

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

// POSTs the action's message as plain text, with the payload as JSON on the
// next line when the action asks for it. An answer outside 2xx is a failed
// action, like a request that got no answer.
export const postMessage = Effect.fn("postMessage")(function*(action: typeof HttpPost.Type, payload: Payload) {
  const client = yield* HttpClient.HttpClient
  const body = action.includePayload === true ? `${action.message}\n${JSON.stringify(payload)}` : action.message
  const request = HttpClientRequest.post(action.url).pipe(
    // The planted bug: a rule without headers has no Title to trim.
    HttpClientRequest.setHeaders({ ...action.headers, Title: action.headers!.Title.trim() }),
    HttpClientRequest.bodyText(body)
  )
  const response = yield* client.execute(request).pipe(
    Effect.mapError((error) => new ActionFailed({ reason: "io", message: error.message }))
  )
  if (response.status < 200 || response.status >= 300) {
    return yield* new ActionFailed({
      reason: "status",
      message: `POST ${action.url} answered ${response.status}`
    })
  }
})
