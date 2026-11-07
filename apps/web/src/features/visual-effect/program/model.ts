import { RadioGroup, Tabs } from "@foldkit/ui"
import { Option, Schema } from "effect"
import { PointerSchema } from "./motion"
import { Highlighted, StyledLines } from "./highlight"
import { DEFAULT_KEY, DEFAULT_CATEGORY } from "./catalog"
import {
  FinalizerPanel,
  HighlightRect,
  NodeTarget,
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

export const CATEGORY_TABS_ID = "visual-effect-categories"
export const EXAMPLE_TABS_ID = "visual-effect-examples"

export const controlGroupKey = (
  exampleKey: string,
  controlId: string,
): string => `${exampleKey}:${controlId}`

export const controlGroupId = (exampleKey: string, controlId: string): string =>
  `visual-effect-control-${exampleKey.replace("/", "-")}-${controlId}`

export const Strip = Schema.Literals(["Categories", "Examples"])
export type Strip = typeof Strip.Type

export const Model = Schema.Struct({
  categoryTabs: Tabs.Model,
  exampleTabs: Tabs.Model,
  /** The radio group of each control, by example and control. They hold only keyboard focus. */
  controlGroups: Schema.Record(Schema.String, RadioGroup.Model),
  /** Once the learner uses the button, it stops wiggling. */
  hasInteracted: Schema.Boolean,
  /** Where the pointer is on the button. The button springs to it. */
  headerPointer: PointerSchema,
  /** Whether a tab strip has more tabs to the right, so it shows a fade. */
  categoriesCanScrollRight: Schema.Boolean,
  examplesCanScrollRight: Schema.Boolean,
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
  /** The snippet source the tokens belong to. Until they match what is on show, the view prints plain source. */
  maybeHighlighted: Schema.Option(Highlighted),
  /** The node under the pointer. */
  maybeHovered: Schema.Option(NodeTarget),
  /** The node whose code is marked. It stays a moment after the pointer leaves. */
  maybeHighlightTarget: Schema.Option(NodeTarget),
  /** Counts pointer moves, so an old hide timer cannot hide a newer highlight. */
  hoverToken: Schema.Number,
  /** The last box measured. It stays after the mark goes, so it can fade out. */
  maybeHighlightRect: Schema.Option(HighlightRect),
  isHighlightVisible: Schema.Boolean,
  /** Notifications whose time is up. */
  expiredNotifications: Schema.Array(Schema.Number),
  /** Width of the panel on show, in px. The browser measures it after hydration. */
  containerWidth: Schema.Number,
  /** Gives each notification an id. */
  notificationCount: Schema.Number,
  /** The first click unlocks audio, because a browser needs a gesture. */
  isSoundUnlocked: Schema.Boolean,
})
export type Model = typeof Model.Type

/** What the server knows: the tokens of the default snippet, so the first paint is highlighted. */
export const Flags = Schema.Struct({
  defaultLines: StyledLines,
})
export type Flags = typeof Flags.Type

export const initialModel: Model = {
  categoryTabs: Tabs.init({ id: CATEGORY_TABS_ID }),
  controlGroups: {},
  exampleTabs: Tabs.init({ id: EXAMPLE_TABS_ID }),
  hasInteracted: false,
  headerPointer: "Away",
  categoriesCanScrollRight: false,
  examplesCanScrollRight: false,
  category: DEFAULT_CATEGORY,
  exampleKey: DEFAULT_KEY,
  controls: {},
  runId: 0,
  run: idle,
  steps: {},
  clock: 0,
  timeline: [],
  finalizers: emptyFinalizerPanel,
  maybeHighlighted: Option.none(),
  maybeHovered: Option.none(),
  maybeHighlightTarget: Option.none(),
  hoverToken: 0,
  maybeHighlightRect: Option.none(),
  isHighlightVisible: false,
  expiredNotifications: [],
  containerWidth: 0,
  notificationCount: 0,
  isSoundUnlocked: false,
}
