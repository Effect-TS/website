import { Effect, FileSystem, Layer } from "effect"
import { HttpClient, HttpRouter, HttpServer, HttpServerError, HttpServerRequest, HttpServerResponse } from "effect/http"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../src/api/Api.ts"
import { Engine } from "../src/Engine.ts"
import { RuleStore } from "../src/RuleStore.ts"
import { RunLog } from "../src/RunLog.ts"
import * as ApiHandlers from "../src/server/Api.ts"

// The application behind the API: the handlers over the Engine and the memory
// stores. The Engine writes to a FileSystem that accepts every write and keeps
// nothing, so no test touches alerts.log.
export const layerApp = ApiHandlers.layer.pipe(
  Layer.provideMerge(Engine.layer),
  Layer.provideMerge(RuleStore.layerMemory),
  Layer.provideMerge(RunLog.layerMemory),
  Layer.provide(FileSystem.layerNoop({
    writeFileString: () => Effect.void,
    writeFile: () => Effect.void
  }))
)

// An HttpClient that never opens a socket: every request is handed to the
// served API in memory, and a failed request becomes the response a real
// server would send for it. The stores stay reachable, so a test can check
// what a request changed on the server.
export const layerServer = Layer.effect(
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
).pipe(Layer.provideMerge(layerApp))
