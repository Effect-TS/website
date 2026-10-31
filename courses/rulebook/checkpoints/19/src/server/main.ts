// Serves the API on http://localhost:3000, with its documentation on /docs.
// Rules and runs are kept in rulebook.db, so they survive a restart. Stored
// interval rules start polling at boot; Ctrl-C interrupts every loop, and each
// writes its last row before the database closes.
//
//   pnpm checkpoint 19 server
//   curl -X POST localhost:3000/rules -H 'content-type: application/json' -d @fixtures/rules/expense.json
//   curl -X POST localhost:3000/events -H 'content-type: application/json' -d @fixtures/events/laptop.json
//   curl localhost:3000/runs
import { NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Layer } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/http"
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api"
import { createServer } from "node:http"
import { Api } from "../api/Api.ts"
import { Engine } from "../Engine.ts"
import * as Migrations from "../Migrations.ts"
import { RuleStore } from "../RuleStore.ts"
import { RunLog } from "../RunLog.ts"
import * as Telemetry from "../Telemetry.ts"
import * as ApiHandlers from "./Api.ts"

const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
  Layer.provide(ApiHandlers.layer)
)

const DocsRoute = HttpApiScalar.layer(Api, { path: "/docs" })

const ServerLayer = HttpRouter.serve(Layer.mergeAll(ApiRoutes, DocsRoute)).pipe(
  Layer.provide(Engine.layer),
  Layer.provide(RuleStore.layerSql),
  Layer.provide(RunLog.layerSql),
  Layer.provide(Migrations.layer),
  Layer.provide(SqliteClient.layer({ filename: "rulebook.db" })),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(NodeServices.layer),
  Layer.provide(Telemetry.layerServer)
)

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
