import * as Data from "effect/Data"
import * as Context from "effect/Context"
import * as HttpApiMiddleware from "effect/http-api/HttpApiMiddleware"
import * as HttpApiSecurity from "effect/http-api/HttpApiSecurity"
import { VoteRefusedError } from "./errors"

/** Who is calling: nobody known, a voter the server issued, or a forged cookie. */
export type Voter = Data.TaggedEnum<{
  Anonymous: {}
  Known: { readonly id: string }
  Tampered: {}
}>

export const Voter = Data.taggedEnum<Voter>()

export class CurrentVoter extends Context.Service<CurrentVoter, Voter>()(
  "motw-vote/CurrentVoter",
) {}

/** The cookie that names a voter. Its value is signed by the server. */
export const voterCookie = HttpApiSecurity.apiKey({
  key: "motw_voter",
  in: "cookie",
})

/** Reads the voter cookie and provides `CurrentVoter`. */
export class VoterIdentity extends HttpApiMiddleware.Service<
  VoterIdentity,
  { provides: CurrentVoter }
>()("motw-vote/VoterIdentity", {
  security: { voter: voterCookie },
}) {}

/** Limits how fast one client can vote. */
export class VoteRateLimit extends HttpApiMiddleware.Service<VoteRateLimit>()(
  "motw-vote/VoteRateLimit",
  { error: VoteRefusedError },
) {}

/** Marks every response private and uncacheable: it depends on the voter. */
export class NoStore extends HttpApiMiddleware.Service<NoStore>()(
  "motw-vote/NoStore",
) {}
