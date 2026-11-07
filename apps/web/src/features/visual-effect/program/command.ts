import { Effect, Option, Schema } from "effect"
import { Command } from "foldkit"
import { findEntry } from "./catalog"
import { HIGHLIGHT_HIDE_DELAY_MS, MAX_TIMER_MS, OffsetRange } from "./domain"
import { measureHighlight } from "./measure"
import { highlight } from "./highlight"
import type { SnippetLanguage } from "../model/snippet-highlights"
import { Message } from "./message"
import * as Runner from "./runner"

export const StartRun = Command.define("StartRun", {
  args: {
    runId: Schema.Number,
    key: Schema.String,
    controls: Schema.Record(Schema.String, Schema.String),
  },
  messages: [Message.CompletedStartRun],
  execute: ({ runId, key, controls }) =>
    Option.match(findEntry(key), {
      onNone: () => Effect.void,
      onSome: ({ example }) => Runner.start(runId, example, controls),
    }).pipe(Effect.as(Message.CompletedStartRun())),
})

export const StopRun = Command.define("StopRun", {
  messages: [Message.CompletedStopRun],
  execute: Runner.stop.pipe(Effect.as(Message.CompletedStopRun())),
})

export const HighlightSnippet = Command.define("HighlightSnippet", {
  args: { language: Schema.String, source: Schema.String },
  messages: [Message.HighlightedSnippet, Message.FailedHighlightSnippet],
  execute: ({ language, source }) =>
    highlight(language as SnippetLanguage, source).pipe(
      Effect.map(({ lines }) => Message.HighlightedSnippet({ source, lines })),
      Effect.catch((error) =>
        Effect.succeed(
          Message.FailedHighlightSnippet({ message: error.message }),
        ),
      ),
    ),
})

/** Hides the highlight a moment after the pointer left, unless a newer move came first. */
export const WaitHighlightDelay = Command.define("WaitHighlightDelay", {
  args: { token: Schema.Number },
  messages: [Message.ElapsedHighlightDelay],
  execute: ({ token }) =>
    Effect.sleep(HIGHLIGHT_HIDE_DELAY_MS).pipe(
      Effect.as(Message.ElapsedHighlightDelay({ token })),
    ),
})

export const WaitNotification = Command.define("WaitNotification", {
  args: { id: Schema.Number, durationMs: Schema.Number },
  messages: [Message.ExpiredNotification],
  execute: ({ id, durationMs }) =>
    Effect.sleep(Math.min(durationMs, MAX_TIMER_MS)).pipe(
      Effect.as(Message.ExpiredNotification({ id })),
    ),
})

/** Measures the code the ranges mark. The browser knows where the tokens sit. */
export const MeasureHighlight = Command.define("MeasureHighlight", {
  args: { ranges: Schema.Array(OffsetRange) },
  messages: [Message.MeasuredHighlight],
  execute: ({ ranges }) =>
    measureHighlight(ranges).pipe(
      Effect.map((maybeRect) => Message.MeasuredHighlight({ maybeRect })),
    ),
})

export { ChangeNode } from "./targets/node"
export { ChangeBubble } from "./targets/bubble"
export { ChangeHighlight } from "./targets/highlight"
export { ChangeHeader } from "./targets/header"
export { ChangeCard } from "./targets/card"
