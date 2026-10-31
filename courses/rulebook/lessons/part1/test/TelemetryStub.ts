// Stands in for lessons/part1/Telemetry.ts while the Part 1 tests run a lesson
// (telemetryHooks.ts swaps it in). It exports nothing, so no viewer or
// collector is involved, and writes each log to stdout as one line naming the
// span the log was written in:
//
//   INFO [evaluate] expense 1200 over 500
//
// A cause logged with the message follows on the next lines. runMain reports a
// failure outside the provided layer, so that still uses the default logger.
import { Cause, Context, Logger, Tracer } from "effect"
import { inspect } from "node:util"
import type * as Telemetry from "../Telemetry.ts"

const stdout = Logger.make(({ cause, fiber, logLevel, message }) => {
  const span = Context.getOption(fiber.context, Tracer.ParentSpan)
  const name = span._tag === "Some" && span.value._tag === "Span" ? ` [${span.value.name}]` : ""
  const parts = (Array.isArray(message) ? message : [message]).map((part) =>
    typeof part === "string" ? part : inspect(part)
  )
  const failure = cause.reasons.length > 0 ? `\n${Cause.pretty(cause)}` : ""
  process.stdout.write(`${logLevel.toUpperCase()}${name} ${parts.join(" ")}${failure}\n`)
})

export const layer: typeof Telemetry.layer = Logger.layer([stdout])
