import * as Schema from "effect/Schema"
import { VOTE_REFUSALS } from "./domain"

/** A vote turned down, with the reason. The API answers it with a 409. */
export class VoteRefusedError extends Schema.TaggedError<VoteRefusedError>()(
  "VoteRefusedError",
  { reason: Schema.Literals(VOTE_REFUSALS) },
  { httpApiStatus: 409 },
) {}
