// Serves the API on http://localhost:3000, with its documentation on /docs.
// Rules and runs are kept in rulebook.db, so they survive a restart. While it
// runs, the heartbeat logs the number of rules; Ctrl-C stops it, and it says so.
//
//   pnpm checkpoint 18 server
//   curl -X POST localhost:3000/rules -H 'content-type: application/json' -d @fixtures/rules/expense.json
//   curl -X POST localhost:3000/events -H 'content-type: application/json' -d @fixtures/events/laptop.json
//   curl localhost:3000/runs
import { NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Layer } from "effect"
import { HttpRouter } from "effect/http"
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api"
import { createServer } from "node:http"
import { Api } from "../api/Api.ts"
import { Engine } from "../Engine.ts"
import * as Heartbeat from "../Heartbeat.ts"
import * as Migrations from "../Migrations.ts"
import { RuleStore } from "../RuleStore.ts"
import { RunLog } from "../RunLog.ts"
import * as Telemetry from "../Telemetry.ts"
import * as ApiHandlers from "./Api.ts"

const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
  Layer.provide(ApiHandlers.layer)
)

const DocsRoute = HttpApiScalar.layer(Api, { path: "/docs" })

const ServerLayer = Layer.mergeAll(HttpRouter.serve(Layer.mergeAll(ApiRoutes, DocsRoute)), Heartbeat.layer).pipe(
  Layer.provide(Engine.layer),
  Layer.provide(RuleStore.layerSql),
  Layer.provide(RunLog.layerSql),
  Layer.provide(Migrations.layer),
  Layer.provide(SqliteClient.layer({ filename: "rulebook.db" })),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.provide(NodeServices.layer),
  Layer.provide(Telemetry.layerServer)
)

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
