import { Effect, Option, Schema } from "effect"
import { Command } from "foldkit"
import { findEntry } from "./catalog"
import {
  FinalizerPhase,
  HIGHLIGHT_HIDE_DELAY_MS,
  MAX_TIMER_MS,
  OffsetRange,
} from "./domain"
import { measureHighlight } from "./measure"
import { highlight } from "./highlight"
import type { SnippetLanguage } from "../model/snippet-highlights"
import { Message } from "./message"
import {
  HEADER_ID,
  HIGHLIGHT_ID,
  NodeTagSchema,
  PointerSchema,
  afterRender,
  bubbles,
  cards,
  header,
  highlights,
  nodes,
} from "./motion"
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

/** Moves a node to its new state. */
export const ChangeNode = Command.define("ChangeNode", {
  args: { id: Schema.String, tag: NodeTagSchema },
  messages: [Message.CompletedAnimateNode],
  execute: ({ id, tag }) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => nodes.apply(id, tag))),
      Effect.as(Message.CompletedAnimateNode()),
    ),
})

/** Gives the play, stop and reset button its new state. */
export const ChangeHeader = Command.define("ChangeHeader", {
  args: {
    tag: NodeTagSchema,
    hasInteracted: Schema.Boolean,
    pointer: PointerSchema,
  },
  messages: [Message.CompletedAnimateHeader],
  execute: (input) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => header.apply(HEADER_ID, input))),
      Effect.as(Message.CompletedAnimateHeader()),
    ),
})

/** Moves a finalizer card to its new place and phase. */
export const ChangeCard = Command.define("ChangeCard", {
  args: {
    id: Schema.String,
    x: Schema.Number,
    scale: Schema.Number,
    phase: FinalizerPhase,
  },
  messages: [Message.CompletedAnimateFinalizerCard],
  execute: ({ id, ...input }) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => cards.apply(id, input))),
      Effect.as(Message.CompletedAnimateFinalizerCard()),
    ),
})

/** Moves the highlight box to its new target, or fades it. */
export const ChangeHighlight = Command.define("ChangeHighlight", {
  args: {
    x: Schema.Number,
    y: Schema.Number,
    width: Schema.Number,
    height: Schema.Number,
    isVisible: Schema.Boolean,
  },
  messages: [Message.CompletedAnimateHighlight],
  execute: (input) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => highlights.apply(HIGHLIGHT_ID, input))),
      Effect.as(Message.CompletedAnimateHighlight()),
    ),
})

/** Shows or hides the shake of a bubble. */
export const ChangeBubble = Command.define("ChangeBubble", {
  args: { id: Schema.Number, isVisible: Schema.Boolean },
  messages: [Message.CompletedShakeBubble],
  execute: ({ id, isVisible }) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => bubbles.apply(String(id), isVisible))),
      Effect.as(Message.CompletedShakeBubble()),
    ),
})
