import { Schema } from "effect"

export class ShortenError extends Schema.TaggedError<ShortenError>()(
  "ShortenError",
  { reason: Schema.Literal("TooLarge", "Unknown"), method: Schema.String }
) {}

export class ShortenRequest extends Schema.TaggedRequest<ShortenRequest>()(
  "ShortenRequest",
  {
    failure: ShortenError,
    success: Schema.String,
    payload: { text: Schema.String }
  }
) {}

export class RetrieveRequest extends Schema.TaggedRequest<RetrieveRequest>()(
  "RetrieveRequest",
  {
    failure: ShortenError,
    success: Schema.Option(Schema.String),
    payload: { hash: Schema.String }
  }
) {}
