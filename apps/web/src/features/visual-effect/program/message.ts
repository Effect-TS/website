import { RadioGroup, Tabs } from "@foldkit/ui"
import { Schema } from "effect"
import { defineMessageUnion } from "foldkit/message"
import { FinalizerEvent, HighlightRect, NodeTarget, Outcome } from "./domain"
import { StyledLines } from "./highlight"
import { Category, Strip } from "./model"

export const Message = defineMessageUnion({
  ClickedCategory: { category: Category },
  ClickedExample: { key: Schema.String },
  GotCategoryTabsMessage: { message: Tabs.Message },
  GotExampleTabsMessage: { message: Tabs.Message },
  GotControlGroupMessage: {
    controlId: Schema.String,
    message: RadioGroup.Message,
  },
  ChangedStripFade: { strip: Strip, canScrollRight: Schema.Boolean },
  /** Starts, stops or resets, depending on the run. */
  ClickedHeader: {},
  EnteredHeader: {},
  LeftHeader: {},
  PressedHeader: {},
  ReleasedHeader: {},
  ChangedControl: { controlId: Schema.String, value: Schema.String },
  /** The next Messages come from the run that `runId` names. A reset makes the old ones stale. */
  StartedRun: { runId: Schema.Number, at: Schema.Number },
  StartedStep: {
    runId: Schema.Number,
    stepIndex: Schema.Number,
    at: Schema.Number,
  },
  EndedStep: {
    runId: Schema.Number,
    stepIndex: Schema.Number,
    at: Schema.Number,
    outcome: Outcome,
  },
  EndedRun: { runId: Schema.Number, at: Schema.Number, outcome: Outcome },
  /** A notification belongs to a step, or to the whole example when there is no step. */
  ShowedNotification: {
    runId: Schema.Number,
    maybeStepIndex: Schema.Option(Schema.Number),
    message: Schema.String,
    durationMs: Schema.Number,
    showOnHover: Schema.Boolean,
  },
  ChangedFinalizers: { runId: Schema.Number, event: FinalizerEvent },
  TickedClock: { at: Schema.Number },
  ChangedContainerWidth: { width: Schema.Number },
  HoveredNode: { target: NodeTarget },
  LeftNode: {},
  ElapsedHighlightDelay: { token: Schema.Number },
  ExpiredNotification: { id: Schema.Number },
  MeasuredHighlight: { maybeRect: Schema.Option(HighlightRect) },
  HighlightedSnippet: { source: Schema.String, lines: StyledLines },
  FailedHighlightSnippet: { message: Schema.String },
  CompletedStartRun: {},
  CompletedStopRun: {},
  CompletedAnimateNode: {},
  CompletedAnimateHeader: {},
  CompletedShakeBubble: {},
  CompletedAnimateFinalizerCard: {},
  CompletedAnimateHighlight: {},
  CompletedPulseChevrons: {},
})
export type Message = typeof Message.Type
