// Serves the API on http://localhost:3000, with its documentation on /docs.
// Rules and runs are kept in rulebook.db, so they survive a restart. From
// lesson 20 an httpPost rule really sends its POST; try one rule at a time
// against the receiver (`pnpm receiver` in another terminal):
//
//   pnpm checkpoint 20 server
//   pnpm checkpoint 20 cli rules add fixtures/rules/post-fail.json    failed (status): ... answered 500
//   pnpm checkpoint 20 cli rules add fixtures/rules/post-slow.json    failed (timeout) after 10 seconds
//   pnpm checkpoint 20 cli events submit fixtures/events/laptop.json
//   pnpm checkpoint 20 cli runs list
//
// The third outcome, crashed, comes from the bug exercise 20 plants in
// src/Action.ts. All three are red Engine.execute spans in the viewer.
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
