import * as Schema from "effect/Schema"

export class ShortenError extends Schema.TaggedError<ShortenError>()("ShortenError", {
  reason: Schema.Literal("TooLarge", "Unknown"),
  method: Schema.String
}) {}
