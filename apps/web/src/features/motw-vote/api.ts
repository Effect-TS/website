import * as Context from "effect/Context"
import type * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as HttpApi from "effect/http-api/HttpApi"
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint"
import * as HttpApiGroup from "effect/http-api/HttpApiGroup"
import * as HttpApiMiddleware from "effect/http-api/HttpApiMiddleware"
import * as HttpApiSecurity from "effect/http-api/HttpApiSecurity"
import { Tally, VoteOutcome, VoteRefusedError } from "./domain"

const ModuleId = Schema.String.check(Schema.isMaxLength(200))

// Turnstile tokens are at most 2048 characters
const Token = Schema.String.check(Schema.isMaxLength(2048))

export class CurrentVoter extends Context.Service<
  CurrentVoter,
  Option.Option<string>
>()("website/CurrentVoter") {}

export const voterCookie = HttpApiSecurity.apiKey({
  key: "motw_voter",
  in: "cookie",
})

export class VoterIdentity extends HttpApiMiddleware.Service<
  VoterIdentity,
  { provides: CurrentVoter }
>()("website/VoterIdentity", {
  security: { voter: voterCookie },
}) {}

export class VoteRateLimit extends HttpApiMiddleware.Service<VoteRateLimit>()(
  "website/VoteRateLimit",
  { error: VoteRefusedError },
) {}

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
      payload: Schema.Struct({ id: ModuleId, token: Token }),
      success: VoteOutcome,
      error: VoteRefusedError,
    }).middleware(VoteRateLimit),
    HttpApiEndpoint.post("unvote", "/api/motw-vote/unvote", {
      payload: Schema.Struct({ id: ModuleId }),
      success: VoteOutcome,
    }).middleware(VoteRateLimit),
  )
  .middleware(VoterIdentity) {}

export class MotwVoteApi extends HttpApi.make("motwVoteApi").add(
  MotwVoteApiGroup,
) {}
