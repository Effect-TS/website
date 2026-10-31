import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/http-api"
import { Outcome } from "../Engine.ts"
import { Event, Rule } from "../Rule.ts"
import { RuleNotFound, StoredRule } from "../RuleStore.ts"
import { Run } from "../RunLog.ts"

// The API is a value: the server implements it and, from lesson 15, the CLI
// derives its client from it. Every schema here is one the domain already has.

// A rule id the server does not know is a 404 on the wire, and a RuleNotFound
// again when the client decodes it.
const NotFound = RuleNotFound.pipe(HttpApiSchema.status(404))

export class RulesApi extends HttpApiGroup.make("rules")
  .add(
    HttpApiEndpoint.post("create", "/", { payload: Rule, success: StoredRule }),
    HttpApiEndpoint.get("list", "/", { success: Schema.Array(StoredRule) }),
    HttpApiEndpoint.get("get", "/:id", { params: { id: Schema.String }, success: StoredRule, error: NotFound }),
    HttpApiEndpoint.delete("remove", "/:id", { params: { id: Schema.String }, error: NotFound }),
    HttpApiEndpoint.post("run", "/:id/run", {
      params: { id: Schema.String },
      payload: Event,
      success: Outcome,
      error: NotFound
    })
  )
  .prefix("/rules")
{}

export class EventsApi extends HttpApiGroup.make("events")
  .add(HttpApiEndpoint.post("submit", "/", { payload: Event, success: Schema.Array(Outcome) }))
  .prefix("/events")
{}

export class RunsApi extends HttpApiGroup.make("runs")
  .add(
    HttpApiEndpoint.get("list", "/", {
      query: {
        ruleId: Schema.optional(Schema.String),
        limit: Schema.optional(Schema.Int.check(Schema.isGreaterThan(0)))
      },
      success: Schema.Array(Run)
    })
  )
  .prefix("/runs")
{}

export class Api extends HttpApi.make("rulebook")
  .add(RulesApi)
  .add(EventsApi)
  .add(RunsApi)
  .annotateMerge(OpenApi.annotations({ title: "rulebook" }))
{}
