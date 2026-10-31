import { ConfigProvider, Effect, FileSystem, Layer, Tracer } from "effect"
import { HttpClient, HttpRouter, HttpServer, HttpServerError, HttpServerRequest, HttpServerResponse } from "effect/http"
import { HttpApiBuilder, HttpApiTest } from "effect/http-api"
import { Api } from "../src/api/Api.ts"
import { Engine } from "../src/Engine.ts"
import type { Rule } from "../src/Rule.ts"
import { RuleStore } from "../src/RuleStore.ts"
import { RunLog } from "../src/RunLog.ts"
import * as ApiHandlers from "../src/server/Api.ts"
import * as Harness from "./harness.ts"

export const makeClient = HttpApiTest.groups(Api, ["rules", "events", "runs"])

export interface AppOptions {
  readonly reply?: (url: string) => Harness.Reply
  readonly held?: boolean
  // The environment the limits are read from; empty unless a test sets it,
  // so the defaults apply whatever the shell running the tests exports.
  readonly env?: Record<string, string>
}

// The served API over the Engine and the memory stores, posting and polling
// through the fake server. Writes go to a FileSystem that keeps nothing.
export const layerApp = (options: AppOptions = {}) =>
  ApiHandlers.layer.pipe(
    Layer.provideMerge(Engine.layer),
    Layer.provideMerge(Layer.merge(RuleStore.layerMemory, RunLog.layerMemory)),
    Layer.provideMerge(Harness.layer(options.reply, { held: options.held ?? false })),
    Layer.provide(FileSystem.layerNoop({ writeFileString: () => Effect.void, writeFile: () => Effect.void })),
    Layer.merge(HttpServer.layerServices),
    Layer.provideMerge(ConfigProvider.layer(ConfigProvider.fromEnv({ env: options.env ?? {} })))
  )

// An HttpClient that hands every request to the served API in memory, for
// the CLI's ApiClient.
export const layerServer = (options: AppOptions = {}) =>
  Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function*() {
      const handler = yield* HttpRouter.toHttpEffect(
        HttpApiBuilder.layer(Api).pipe(Layer.provide(HttpServer.layerServices))
      )
      return HttpClient.make((request) =>
        handler.pipe(
          Effect.catchCause((cause) => Effect.map(HttpServerError.causeResponse(cause), ([response]) => response)),
          Effect.map((response) => HttpServerResponse.toClientResponse(response, { request })),
          Effect.provideService(HttpServerRequest.HttpServerRequest, HttpServerRequest.fromClientRequest(request)),
          Effect.scoped,
          Effect.orDie
        )
      )
    })
  ).pipe(Layer.provide(layerApp(options)))

// A tracer that keeps every span it starts.
export const captureSpans = () => {
  const spans: Array<Tracer.NativeSpan> = []
  const tracer = Tracer.make({
    span: (options) => {
      const span = new Tracer.NativeSpan(options)
      spans.push(span)
      return span
    }
  })
  // The Engine.execute spans, keyed by the rule id they are annotated with.
  const executions = () =>
    spans.filter((span) => span.name === "Engine.execute").map((span) => ({
      ruleId: span.attributes.get("rule.id"),
      span
    }))
  return { spans, tracer, executions }
}

export const post = (name: string, url: string, event = "expense"): Rule => ({
  name,
  trigger: { type: "event", event },
  action: { type: "httpPost", url, message: name }
})
