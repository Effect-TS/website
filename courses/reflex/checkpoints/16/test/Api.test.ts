import { assert, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientRequest, HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import { Api } from "../src/api/Api.ts"
import type { Rule } from "../src/Rule.ts"
import { RuleNotFound } from "../src/RuleStore.ts"
import { layerApp, layerServer } from "./support.ts"

const makeClient = HttpApiTest.groups(Api, ["rules", "events", "runs"])

const expense = (name: string, over: number): Rule => ({
  name,
  trigger: { type: "event", event: "expense" },
  condition: { field: "amount", op: "gt", value: over },
  action: { type: "appendFile", path: "alerts.log", message: name }
})

const laptop = { type: "expense", amount: 1200, description: "laptop" }

layer(Layer.mergeAll(layerApp, HttpServer.layerServices), { buildPerTest: true })("HttpApi", (it) => {
  it.effect("creates, lists, gets and removes rules; an unknown id is a typed RuleNotFound", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const created = yield* client.rules.create({ payload: expense("large expense", 500) })
      assert.strictEqual(created.name, "large expense")
      assert.deepStrictEqual((yield* client.rules.list()).map((rule) => rule.id), [created.id])
      assert.deepStrictEqual(yield* client.rules.get({ params: { id: created.id } }), created)

      yield* client.rules.remove({ params: { id: created.id } })
      assert.deepStrictEqual(yield* client.rules.list(), [])
      const error = yield* Effect.flip(client.rules.get({ params: { id: created.id } }))
      assert.deepStrictEqual(error, new RuleNotFound({ id: created.id }))
    }))

  it.effect("submits an event to every matching rule, runs one rule by id and lists the runs", () =>
    Effect.gen(function*() {
      const client = yield* makeClient
      const large = yield* client.rules.create({ payload: expense("large expense", 500) })
      const huge = yield* client.rules.create({ payload: expense("huge expense", 5000) })

      const outcomes = yield* client.events.submit({ payload: laptop })
      assert.deepStrictEqual(
        outcomes.map((outcome) => [outcome.ruleId, outcome.outcome]).toSorted(),
        [[large.id, "succeeded"], [huge.id, "skipped"]].toSorted()
      )

      const manual = yield* client.rules.run({ params: { id: large.id }, payload: laptop })
      assert.strictEqual(manual.ruleId, large.id)
      assert.strictEqual(manual.outcome, "succeeded")
      const missing = yield* Effect.flip(client.rules.run({ params: { id: "nope" }, payload: laptop }))
      assert.deepStrictEqual(missing, new RuleNotFound({ id: "nope" }))

      const largeRuns = yield* client.runs.list({ query: { ruleId: large.id } })
      assert.deepStrictEqual(largeRuns.map((run) => run.id), [
        manual.runId,
        outcomes.find((outcome) => outcome.ruleId === large.id)!.runId
      ])
      assert.deepStrictEqual((yield* client.runs.list({ query: { limit: 1 } })).map((run) => run.id), [manual.runId])
      assert.strictEqual((yield* client.runs.list({ query: {} })).length, 3)
    }))
})

layer(layerServer, { buildPerTest: true })("HttpApi over HTTP", (it) => {
  it.effect("answers an unknown rule with 404 and a limit that is not a positive integer with 400", () =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const status = (method: "GET" | "DELETE" | "POST", url: string) =>
        client.execute(
          method === "POST"
            ? HttpClientRequest.post(url).pipe(HttpClientRequest.bodyJsonUnsafe(laptop))
            : HttpClientRequest.make(method)(url)
        ).pipe(Effect.map((response) => response.status))

      assert.strictEqual(yield* status("GET", "http://localhost/rules/nope"), 404)
      assert.strictEqual(yield* status("DELETE", "http://localhost/rules/nope"), 404)
      assert.strictEqual(yield* status("POST", "http://localhost/rules/nope/run"), 404)
      assert.strictEqual(yield* status("GET", "http://localhost/runs?limit=2"), 200)
      for (const limit of ["abc", "-1", "1.5"]) {
        assert.strictEqual(yield* status("GET", `http://localhost/runs?limit=${limit}`), 400, `limit=${limit}`)
      }
    }))
})
