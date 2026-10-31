import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, FileSystem, Layer, Option, Path, Schema } from "effect"
import { HttpClient, HttpClientRequest } from "effect/http"
import * as Receiver from "../tools/receiver.ts"

// Every test gets a fresh receiver on an ephemeral port, so the /flaky and
// /status state never leaks between tests.
const withReceiver = Effect.provide(
  Receiver.layer.pipe(Layer.provideMerge(NodeHttpServer.layerTest))
)

const MixedRule = Schema.fromJsonString(Schema.Struct({
  action: Schema.Struct({ url: Schema.String })
}))

describe("receiver", () => {
  it.live("/ok answers 200 to GET and POST", () =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const get = yield* client.get("/ok")
      const post = yield* client.post("/ok")
      assert.deepStrictEqual([get.status, post.status], [200, 200])
    }).pipe(withReceiver))

  it.live("/slow?ms= answers 200 after the requested delay", () =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const [elapsed, response] = yield* Effect.timed(client.get("/slow", { urlParams: { ms: "300" } }))
      assert.strictEqual(response.status, 200)
      assert.isTrue(Duration.toMillis(elapsed) >= 300)
    }).pipe(withReceiver))

  it.live("/fail?status= answers with the requested status", () =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const response = yield* client.post("/fail", { urlParams: { status: "503" } })
      assert.strictEqual(response.status, 503)
    }).pipe(withReceiver))

  it.live("/flaky alternates 500 and 200, starting with 500", () =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const statuses = yield* Effect.forEach([1, 2, 3, 4], () => client.get("/flaky").pipe(Effect.map((_) => _.status)))
      assert.deepStrictEqual(statuses, [500, 200, 500, 200])
    }).pipe(withReceiver))

  it.live("/status follows the mode set with POST /status/mode", () =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const setMode = (mode: "ok" | "degraded" | "error") =>
        HttpClientRequest.post("/status/mode").pipe(
          HttpClientRequest.bodyJsonUnsafe({ mode }),
          HttpClient.filterStatusOk(client).execute
        )
      const readStatus = Effect.gen(function*() {
        const response = yield* client.get("/status")
        return response.status === 200 ? yield* response.json : response.status
      })

      assert.deepStrictEqual(yield* readStatus, { status: "ok" })
      yield* setMode("degraded")
      assert.deepStrictEqual(yield* readStatus, { status: "degraded" })
      yield* setMode("error")
      assert.strictEqual(yield* readStatus, 500)
      yield* setMode("ok")
      assert.deepStrictEqual(yield* readStatus, { status: "ok" })
    }).pipe(withReceiver))

  // Lesson 21 and 22: the mixed scenario's four rules (A and B to /ok, C to
  // /slow beyond the 10 second run timeout, D to /fail?status=500) are all
  // served by the receiver.
  it.live("serves the four endpoints of the mixed scenario", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const client = yield* HttpClient.HttpClient
      const directory = path.join(import.meta.dirname, "..", "fixtures", "rules", "mixed")
      const files = yield* fs.readDirectory(directory)
      const urls = yield* Effect.forEach(files, (file) =>
        fs.readFileString(path.join(directory, file)).pipe(
          Effect.flatMap(Schema.decodeEffect(MixedRule)),
          Effect.map((rule) => new URL(rule.action.url))
        ))

      const outcomes = yield* Effect.forEach(urls, (url) =>
        client.post(url.pathname + url.search).pipe(
          Effect.map((response) => String(response.status)),
          Effect.timeoutOption("1 second"),
          Effect.map(Option.getOrElse(() => "no answer within 1s"))
        ), { concurrency: "unbounded" })

      assert.deepStrictEqual(outcomes.toSorted(), ["200", "200", "500", "no answer within 1s"])
      const slow = urls.find((url) => url.pathname === "/slow")
      assert.isTrue(Number(slow?.searchParams.get("ms")) > 10_000)
    }).pipe(withReceiver))
})
