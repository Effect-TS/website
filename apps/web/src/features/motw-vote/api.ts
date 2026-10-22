import * as Schema from "effect/Schema"
import * as HttpApi from "effect/http-api/HttpApi"
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint"
import * as HttpApiGroup from "effect/http-api/HttpApiGroup"
import { Tally } from "./domain"
import { VoteRefusedError } from "./errors"
import { NoStore, VoteRateLimit, VoterIdentity } from "./middleware"

const MAX_ID_LENGTH = 200

// Turnstile tokens are at most 2048 characters
const MAX_TOKEN_LENGTH = 2048

export class MotwVoteApiGroup extends HttpApiGroup.make("motwVote", {
  topLevel: true,
})
  .add(
    HttpApiEndpoint.get("ranking", "/api/motw-vote", {
      success: Schema.Struct({
        requests: Schema.Array(Tally),
        voted: Schema.Array(Schema.String),
        turnstileSiteKey: Schema.String,
      }),
    }),
    HttpApiEndpoint.post("vote", "/api/motw-vote/vote", {
      payload: Schema.Struct({
        id: Schema.String.check(Schema.isMaxLength(MAX_ID_LENGTH)),
        on: Schema.Boolean,
        token: Schema.optional(
          Schema.String.check(Schema.isMaxLength(MAX_TOKEN_LENGTH)),
        ),
      }),
      success: Schema.Struct({ ...Tally.fields, voted: Schema.Boolean }),
      error: VoteRefusedError,
    }).middleware(VoteRateLimit),
  )
  .middleware(VoterIdentity)
  .middleware(NoStore) {}

export class MotwVoteApi extends HttpApi.make("motwVoteApi").add(
  MotwVoteApiGroup,
) {}
