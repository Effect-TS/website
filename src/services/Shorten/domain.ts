import { Schema } from "@effect/schema"

export class ShortenError extends Schema.TaggedError<ShortenError>()(
  "ShortenError",
  { reason: Schema.Literal("TooLarge", "Unknown"), method: Schema.String }
) {}

export class ShortenRequest extends Schema.TaggedRequest<ShortenRequest>()(
  "ShortenRequest",
  ShortenError,
  Schema.String,
  { text: Schema.String }
) {}

export class RetrieveRequest extends Schema.TaggedRequest<RetrieveRequest>()(
  "RetrieveRequest",
  ShortenError,
  Schema.NullOr(Schema.String),
  { hash: Schema.String }
) {}
