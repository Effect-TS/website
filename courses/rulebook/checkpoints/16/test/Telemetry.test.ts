import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option, Tracer } from "effect"
import { FetchHttpClient, HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import { Api } from "../src/api/Api.ts"
import * as Telemetry from "../src/Telemetry.ts"
import { layerApp } from "./support.ts"

describe("Telemetry", () => {
  it.effect("the app exports Engine.execute under Engine.handleEvent with the rule id", () => {
    const spans: Array<Tracer.NativeSpan> = []
    const tracer = Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options)
        spans.push(span)
        return span
      }
    })
    return Effect.gen(function*() {
      const client = yield* HttpApiTest.groups(Api, ["rules", "events"])
      const rule = yield* client.rules.create({
        payload: {
          name: "every expense",
          trigger: { type: "event", event: "expense" },
          action: { type: "appendFile", path: "alerts.log", message: "expense" }
        }
      })
      yield* client.events.submit({ payload: { type: "expense", amount: 40 } })

      const [execute] = spans.filter((span) => span.name === "Engine.execute")
      assert.strictEqual(execute.attributes.get("rule.id"), rule.id)
      const parent = Option.getOrUndefined(execute.parent)
      assert.strictEqual(parent?._tag === "Span" ? parent.name : undefined, "Engine.handleEvent")
    }).pipe(
      Effect.provide(Layer.mergeAll(layerApp, HttpServer.layerServices)),
      Effect.withTracer(tracer)
    )
  })

  it.effect("the server and CLI layers export as rulebook-server and rulebook-cli", () =>
    Effect.gen(function*() {
      const server = yield* exported(Telemetry.layerServer)
      const cli = yield* exported(Telemetry.layerCli)
      assert.isNotEmpty(server)
      assert.isNotEmpty(cli)
      for (const body of server) assert.include(body, "rulebook-server")
      for (const body of cli) assert.include(body, "rulebook-cli")
    }))
})

// The OTLP batches a telemetry layer sends that carry one span named "probe".
// fetch is replaced, so nothing leaves the process; the batches are flushed
// when the layer is released.
const exported = (layer: Layer.Layer<never>) =>
  Effect.gen(function*() {
    const bodies: Array<string> = []
    const fetch: typeof globalThis.fetch = async (_input, init) => {
      bodies.push(await new Response(init?.body).text())
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } })
    }
    yield* Effect.void.pipe(
      Effect.withSpan("probe"),
      Effect.provide(layer),
      Effect.provideService(FetchHttpClient.Fetch, fetch)
    )
    return bodies.filter((body) => body.includes("probe"))
  })
