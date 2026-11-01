import { Effect, Schema } from "effect"
import { HttpClient } from "effect/http"
import { ActionFailed } from "./Action.ts"

// GETs the URL of an interval rule and turns the answer into the payload its
// condition reads: `{ status, body }`, with `body` parsed as JSON when it is
// JSON and kept as text otherwise.
export const poll = Effect.fn("poll")(function*(url: string) {
  const client = yield* HttpClient.HttpClient
  const response = yield* client.get(url).pipe(
    Effect.mapError((error) => new ActionFailed({ reason: "io", message: error.message }))
  )
  if (response.status < 200 || response.status >= 300) {
    return yield* new ActionFailed({ reason: "status", message: `GET ${url} answered ${response.status}` })
  }
  const text = yield* response.text.pipe(
    Effect.mapError((error) => new ActionFailed({ reason: "io", message: error.message }))
  )
  const body = yield* Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown))(text).pipe(
    Effect.orElseSucceed(() => text)
  )
  return { status: response.status, body }
})
