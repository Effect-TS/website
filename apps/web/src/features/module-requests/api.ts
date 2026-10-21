import * as Schema from "effect/Schema"
import * as HttpApi from "effect/http-api/HttpApi"
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint"
import * as HttpApiGroup from "effect/http-api/HttpApiGroup"
import { VOTE_REFUSALS } from "./domain"

export class VoteRefusedError extends Schema.TaggedError<VoteRefusedError>()(
  "VoteRefusedError",
  { reason: Schema.Literals(VOTE_REFUSALS) },
  { httpApiStatus: 409 },
) {}

const VoterId = Schema.String.check(Schema.isUUID())

const headers = { "x-voter-id": VoterId }

export const Tally = Schema.Struct({
  id: Schema.String,
  votes: Schema.Number,
})

export class ModuleRequestsApiGroup extends HttpApiGroup.make(
  "moduleRequests",
  {
    topLevel: true,
  },
).add(
  HttpApiEndpoint.get("ranking", "/api/module-requests", {
    headers,
    success: Schema.Struct({
      requests: Schema.Array(Tally),
      voted: Schema.Array(Schema.String),
      turnstileSiteKey: Schema.String,
    }),
  }),
  HttpApiEndpoint.post("vote", "/api/module-requests/vote", {
    headers,
    payload: Schema.Struct({
      id: Schema.String,
      on: Schema.Boolean,
      token: Schema.optional(Schema.String),
    }),
    success: Schema.Struct({ ...Tally.fields, voted: Schema.Boolean }),
    error: VoteRefusedError,
  }),
) {}

export class ModuleRequestsApi extends HttpApi.make("moduleRequestsApi").add(
  ModuleRequestsApiGroup,
) {}
