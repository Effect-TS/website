// Serves the API on http://localhost:3000, with its documentation on /docs.
//
//   pnpm checkpoint 15 server
//   curl -X POST localhost:3000/rules -H 'content-type: application/json' -d @fixtures/rules/expense.json
//   curl -X POST localhost:3000/events -H 'content-type: application/json' -d @fixtures/events/laptop.json
//   curl localhost:3000/runs
import { NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node"
import { Layer } from "effect"
import { HttpRouter } from "effect/http"
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api"
import { createServer } from "node:http"
import { Api } from "../api/Api.ts"
import { Engine } from "../Engine.ts"
import { RuleStore } from "../RuleStore.ts"
import { RunLog } from "../RunLog.ts"
import * as ApiHandlers from "./Api.ts"

const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
  Layer.provide(ApiHandlers.layer)
)

const DocsRoute = HttpApiScalar.layer(Api, { path: "/docs" })

const ServerLayer = HttpRouter.serve(Layer.mergeAll(ApiRoutes, DocsRoute)).pipe(
  Layer.provide(Engine.layer),
  Layer.provide(RuleStore.layerMemory),
  Layer.provide(RunLog.layerMemory),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.provide(NodeServices.layer)
)

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
