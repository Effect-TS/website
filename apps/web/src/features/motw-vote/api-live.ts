import * as Layer from "effect/Layer"
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder"
import { MotwVoteApi } from "./api"
import { MotwVoteHandlers } from "./handlers"
import {
  NoStoreLive,
  SameOriginLive,
  VoteRateLimitLive,
  VoterIdentityLive,
} from "./middleware-live"
import { MotwVotes } from "./service"
import { VoterSigner } from "./voter"

/**
 * The vote API with its handlers and middleware. It still needs a `VoteStore`,
 * `ModuleCatalog`, `Turnstile`, `ClientRateLimit`, and the config the signer
 * reads, so it runs on Cloudflare, in `astro dev`, and in tests.
 */
export const MotwVoteLive = HttpApiBuilder.layer(MotwVoteApi).pipe(
  Layer.provide(MotwVoteHandlers),
  Layer.provide(MotwVotes.layer),
  Layer.provide(
    Layer.mergeAll(
      NoStoreLive,
      SameOriginLive,
      VoteRateLimitLive,
      VoterIdentityLive,
    ),
  ),
  Layer.provide(VoterSigner.layer),
)
