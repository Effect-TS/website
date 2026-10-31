import { NodeHttpServer, NodeServices } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Layer } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/http"
import { HttpApiBuilder, HttpApiScalar } from "effect/http-api"
import { createServer } from "node:http"
import { Api } from "./api/Api.ts"
import { ApiClient } from "./ApiClient.ts"
import { Engine } from "./Engine.ts"
import * as Migrations from "./Migrations.ts"
import { RuleStore } from "./RuleStore.ts"
import { RunLog } from "./RunLog.ts"
import * as ApiHandlers from "./server/Api.ts"
import * as Telemetry from "./Telemetry.ts"

// Both programs' layers, in one place. The entrypoints pick theirs and
// provide it once; nothing below them provides anything of its own.

const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
  Layer.provide(ApiHandlers.layer)
)

const DocsRoute = HttpApiScalar.layer(Api, { path: "/docs" })

// The server: the API and its docs on port 3000, over the Engine and the
// stores in reflex.db. Each layer is built after the ones below it and
// closed before them, so on shutdown every loop writes its last row before
// SQLite closes.
export const server = HttpRouter.serve(Layer.mergeAll(ApiRoutes, DocsRoute)).pipe(
  Layer.provide(Engine.layer),
  Layer.provide(RuleStore.layerSql),
  Layer.provide(RunLog.layerSql),
  Layer.provide(Migrations.layer),
  Layer.provide(SqliteClient.layer({ filename: "reflex.db" })),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(NodeServices.layer),
  Layer.provide(Telemetry.layerServer)
)

// The CLI: the ApiClient over fetch, the files it reads, and its own traces.
export const cli = ApiClient.layer.pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.merge(NodeServices.layer),
  Layer.provideMerge(Telemetry.layerCli)
)
