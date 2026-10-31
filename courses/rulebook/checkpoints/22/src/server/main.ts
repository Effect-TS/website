// Serves the API on http://localhost:3000, with its documentation on /docs.
// Rules and runs are kept in rulebook.db, so they survive a restart. The
// rules an event matches run four at a time, and every limit can be changed
// from the environment (see src/Limits.ts). The mixed scenario, with
// `pnpm receiver --scenario mixed` in another terminal:
//
//   pnpm checkpoint 22 server
//   pnpm checkpoint 22 cli rules add fixtures/rules/mixed/a-ok.json      and b-ok, c-slow, d-fail
//   pnpm checkpoint 22 cli events submit fixtures/events/laptop.json   about 10 seconds, not the sum
//   pnpm checkpoint 22 cli runs list                                   two succeeded, two failed
//
// The payoff is your phone. ntfy.sh delivers a POST to https://ntfy.sh/<topic>
// to every device subscribed to that topic, with the `Title` header as the
// notification's title; fixtures/rules/ntfy.json is such a rule. Anyone who
// knows a topic can publish to it and read it, so pick a long random one
// (`node -e "console.log(crypto.randomUUID())"`) and send fixture data only.
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
