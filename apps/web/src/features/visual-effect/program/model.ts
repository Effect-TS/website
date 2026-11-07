import { Schema } from "effect"
import { DEFAULT_KEY, DEFAULT_CATEGORY } from "./catalog"
import {
  FinalizerPanel,
  RunState,
  TimelineSegment,
  emptyFinalizerPanel,
  idle,
} from "./domain"

export const Category = Schema.Literals([
  "concurrency",
  "schedule",
  "error-handling",
  "constructors",
  "scope",
])

export const Model = Schema.Struct({
  category: Category,
  /** The example on show. Only this one ever has state: a switch resets the others. */
  exampleKey: Schema.String,
  /** Control values the learner changed, by example key and control id. */
  controls: Schema.Record(
    Schema.String,
    Schema.Record(Schema.String, Schema.String),
  ),
  /** Counts runs, so a late Message from a stopped run is ignored. */
  runId: Schema.Number,
  run: RunState,
  /** Steps, by their place in the example. */
  steps: Schema.Record(Schema.String, RunState),
  /** The Effect clock in ms while a timeline example runs. */
  clock: Schema.Number,
  timeline: Schema.Array(TimelineSegment),
  finalizers: FinalizerPanel,
  /** Width of the panel on show, in px. The browser measures it after hydration. */
  containerWidth: Schema.Number,
  /** Gives each notification an id. */
  notificationCount: Schema.Number,
  /** The first click unlocks audio, because a browser needs a gesture. */
  isSoundUnlocked: Schema.Boolean,
})
export type Model = typeof Model.Type

/** What the server knows. It is nothing: the first view does not depend on a request. */
export const Flags = Schema.Struct({})
export type Flags = typeof Flags.Type

export const initialModel: Model = {
  category: DEFAULT_CATEGORY,
  exampleKey: DEFAULT_KEY,
  controls: {},
  runId: 0,
  run: idle,
  steps: {},
  clock: 0,
  timeline: [],
  finalizers: emptyFinalizerPanel,
  containerWidth: 0,
  notificationCount: 0,
  isSoundUnlocked: false,
}
