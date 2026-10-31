import { Config, Duration, Schema } from "effect"

// The limits of one server, each read from the environment with a default:
//
//   RULEBOOK_MAX_RULES=100                 rules stored at once
//   RULEBOOK_MAX_PAYLOAD_BYTES=65536       UTF-8 bytes of a submitted event's JSON
//   RULEBOOK_TIMEOUT="10 seconds"          the longest one run may take
//   RULEBOOK_CONCURRENCY=4                 executions of one event at a time
export const Limits = Config.all({
  maxRules: Config.Int("RULEBOOK_MAX_RULES").pipe(Config.withDefault(100)),
  maxPayloadBytes: Config.Int("RULEBOOK_MAX_PAYLOAD_BYTES").pipe(Config.withDefault(64 * 1024)),
  timeout: Config.Duration("RULEBOOK_TIMEOUT").pipe(Config.withDefault(Duration.seconds(10))),
  concurrency: Config.Int("RULEBOOK_CONCURRENCY").pipe(Config.withDefault(4))
})

// Adding a rule when `maxRules` are already stored.
export class TooManyRules extends Schema.TaggedError<TooManyRules>()("TooManyRules", {
  max: Schema.Number
}) {}

// An event whose JSON is over `maxPayloadBytes`.
export class PayloadTooLarge extends Schema.TaggedError<PayloadTooLarge>()("PayloadTooLarge", {
  bytes: Schema.Number,
  max: Schema.Number
}) {}
