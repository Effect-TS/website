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

export class MotwVoteApiGroup extends HttpApiGroup.make("motwVote", {
  topLevel: true,
}).add(
  HttpApiEndpoint.get("ranking", "/api/motw-vote", {
    headers,
    success: Schema.Struct({
      requests: Schema.Array(Tally),
      voted: Schema.Array(Schema.String),
      turnstileSiteKey: Schema.String,
    }),
  }),
  HttpApiEndpoint.post("vote", "/api/motw-vote/vote", {
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

export class MotwVoteApi extends HttpApi.make("motwVoteApi").add(
  MotwVoteApiGroup,
) {}
