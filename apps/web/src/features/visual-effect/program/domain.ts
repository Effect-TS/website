import { Array, Match, Option, Schema } from "effect"

/** Times are epoch milliseconds, so a Model survives JSON and a test can write them. */
export const ResultDisplay = Schema.Struct({
  size: Schema.Literals(["Large", "Small"]),
  text: Schema.String,
})
export type ResultDisplay = typeof ResultDisplay.Type

export const Notification = Schema.Struct({
  id: Schema.Number,
  message: Schema.String,
  durationMs: Schema.Number,
  showOnHover: Schema.Boolean,
})
export type Notification = typeof Notification.Type

const maybeNotification = Schema.Option(Notification)

/** What an effect or a step has done so far. */
export const RunState = Schema.Union([
  Schema.TaggedStruct("Idle", {}),
  Schema.TaggedStruct("Running", {
    startedAt: Schema.Number,
    maybeNotification,
  }),
  Schema.TaggedStruct("Succeeded", {
    value: ResultDisplay,
    endedAt: Schema.Number,
    durationMs: Schema.Number,
    maybeNotification,
  }),
  Schema.TaggedStruct("Failed", {
    error: ResultDisplay,
    endedAt: Schema.Number,
    durationMs: Schema.Number,
    maybeNotification,
  }),
  Schema.TaggedStruct("Interrupted", {
    endedAt: Schema.Number,
    durationMs: Schema.Number,
    maybeNotification,
  }),
  Schema.TaggedStruct("Died", {
    defect: ResultDisplay,
    endedAt: Schema.Number,
    durationMs: Schema.Number,
    maybeNotification,
  }),
])
export type RunState = typeof RunState.Type

export const idle: RunState = { _tag: "Idle" }

export const isRunning = (state: RunState): boolean => state._tag === "Running"

/** A run that ended can be reset. */
export const canReset = (state: RunState): boolean =>
  state._tag !== "Idle" && state._tag !== "Running"

/** How a run ended. The Command turns the Exit into one of these. */
export const Outcome = Schema.Union([
  Schema.TaggedStruct("Succeeded", { value: ResultDisplay }),
  Schema.TaggedStruct("Failed", { error: ResultDisplay }),
  Schema.TaggedStruct("Interrupted", {}),
  Schema.TaggedStruct("Died", { defect: ResultDisplay }),
])
export type Outcome = typeof Outcome.Type

export const notificationOf = (state: RunState): Option.Option<Notification> =>
  state._tag === "Idle" ? Option.none() : state.maybeNotification

export const TimelineSegment = Schema.Struct({
  kind: Schema.Literals(["Running", "Waiting"]),
  startedAt: Schema.Number,
  maybeEndedAt: Schema.Option(Schema.Number),
})
export type TimelineSegment = typeof TimelineSegment.Type

/**
 * Follows the steps that sit on the timeline. A step that starts makes a
 * `Running` segment. A step that ends makes a `Waiting` one. A segment that
 * has the same kind as the last one adds nothing.
 */
export const advanceTimeline = (
  segments: ReadonlyArray<TimelineSegment>,
  step: RunState,
  runStartedAt: number,
): ReadonlyArray<TimelineSegment> => {
  if (step._tag === "Idle") {
    return segments
  }
  const kind = step._tag === "Running" ? "Running" : "Waiting"
  const last = Array.last(segments)
  if (Option.isNone(last)) {
    return [{ kind, startedAt: runStartedAt, maybeEndedAt: Option.none() }]
  }
  if (last.value.kind === kind) {
    return segments
  }
  const at = step._tag === "Running" ? step.startedAt : step.endedAt
  return [
    ...Array.dropRight(segments, 1),
    { ...last.value, maybeEndedAt: Option.some(at) },
    { kind, startedAt: at, maybeEndedAt: Option.none() },
  ]
}

export const FinalizerPhase = Schema.Literals([
  "Pending",
  "Running",
  "Succeeded",
  "Failed",
  "Interrupted",
])
export type FinalizerPhase = typeof FinalizerPhase.Type

export const FinalizerStatus = Schema.Literals([
  "Idle",
  "Active",
  "Releasing",
  "Released",
])
export type FinalizerStatus = typeof FinalizerStatus.Type

export const FinalizerEntry = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  registrationIndex: Schema.Number,
  registeredAt: Schema.Number,
  phase: FinalizerPhase,
  maybeStartedAt: Schema.Option(Schema.Number),
  maybeEndedAt: Schema.Option(Schema.Number),
})
export type FinalizerEntry = typeof FinalizerEntry.Type

export const FinalizerPanel = Schema.Struct({
  status: FinalizerStatus,
  finalizers: Schema.Array(FinalizerEntry),
})
export type FinalizerPanel = typeof FinalizerPanel.Type

export const emptyFinalizerPanel: FinalizerPanel = {
  status: "Idle",
  finalizers: [],
}

export const FinalizerEvent = Schema.Union([
  Schema.TaggedStruct("RunStarted", {}),
  Schema.TaggedStruct("Registered", {
    id: Schema.String,
    label: Schema.String,
    registrationIndex: Schema.Number,
    at: Schema.Number,
  }),
  Schema.TaggedStruct("Started", { id: Schema.String, at: Schema.Number }),
  Schema.TaggedStruct("Finished", {
    id: Schema.String,
    at: Schema.Number,
    phase: Schema.Literals(["Succeeded", "Failed", "Interrupted"]),
  }),
  Schema.TaggedStruct("Reset", {}),
])
export type FinalizerEvent = typeof FinalizerEvent.Type

export const reduceFinalizerPanel = (
  panel: FinalizerPanel,
  event: FinalizerEvent,
): FinalizerPanel =>
  Match.value(event).pipe(
    Match.tagsExhaustive({
      RunStarted: (): FinalizerPanel => ({ status: "Active", finalizers: [] }),
      Registered: (registered): FinalizerPanel => ({
        ...panel,
        finalizers: [
          ...panel.finalizers,
          {
            id: registered.id,
            label: registered.label,
            registrationIndex: registered.registrationIndex,
            registeredAt: registered.at,
            phase: "Pending",
            maybeStartedAt: Option.none(),
            maybeEndedAt: Option.none(),
          },
        ],
      }),
      Started: (started): FinalizerPanel => ({
        status: "Releasing",
        finalizers: Array.map(panel.finalizers, (entry) =>
          entry.id === started.id
            ? {
                ...entry,
                phase: "Running" as const,
                maybeStartedAt: Option.some(started.at),
              }
            : entry,
        ),
      }),
      Finished: (finished): FinalizerPanel => {
        const finalizers = Array.map(panel.finalizers, (entry) =>
          entry.id === finished.id
            ? {
                ...entry,
                phase: finished.phase,
                maybeEndedAt: Option.some(finished.at),
              }
            : entry,
        )
        const isReleasing = Array.some(
          finalizers,
          ({ phase }) => phase === "Pending" || phase === "Running",
        )
        return { status: isReleasing ? "Releasing" : "Released", finalizers }
      },
      Reset: () => emptyFinalizerPanel,
    }),
  )

/** The node the pointer is on. A step is named by its place in the example. */
export const NodeTarget = Schema.Union([
  Schema.TaggedStruct("Step", { index: Schema.Number }),
  Schema.TaggedStruct("Result", {}),
])
export type NodeTarget = typeof NodeTarget.Type

export const sameTarget = (first: NodeTarget, second: NodeTarget): boolean =>
  first._tag === "Step"
    ? second._tag === "Step" && first.index === second.index
    : second._tag === "Result"

/** The box that marks the code a node stands for, in px from the snippet's corner. */
export const HighlightRect = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
})
export type HighlightRect = typeof HighlightRect.Type

export const OffsetRange = Schema.Struct({
  startOffset: Schema.Number,
  endOffset: Schema.Number,
})
export type OffsetRange = typeof OffsetRange.Type

/** How long the highlight stays after the pointer leaves a node. */
export const HIGHLIGHT_HIDE_DELAY_MS = 500

/** A timer cannot wait longer than this: past it the browser fires at once. */
export const MAX_TIMER_MS = 2_147_483_647

/** A notification is visible until its time is up. Then it comes back while the node is hovered. */
export const isNotificationVisible = (
  notification: Notification,
  expired: ReadonlyArray<number>,
  isHovered: boolean,
): boolean =>
  !Array.contains(expired, notification.id) ||
  (notification.showOnHover && isHovered)

/** The notification rule for one node: the node is hovered when it is the Model's hovered target. */
export const isShownOn = (
  model: {
    readonly expiredNotifications: ReadonlyArray<number>
    readonly maybeHovered: Option.Option<NodeTarget>
  },
  target: NodeTarget,
  notification: Notification,
): boolean =>
  isNotificationVisible(
    notification,
    model.expiredNotifications,
    Option.exists(model.maybeHovered, (hovered) => sameTarget(hovered, target)),
  )

/** The finalizer card grows while its run is going. */
export const cardScale = (isRunning: boolean): number => (isRunning ? 1.05 : 1)

/** What a screen reader says about a state, such as "succeeded with 65°". */
export const describe = (state: RunState): string =>
  Match.value(state).pipe(
    Match.tagsExhaustive({
      Idle: () => "not run",
      Running: () => "running",
      Succeeded: ({ value }) => `succeeded with ${value.text}`,
      Failed: ({ error }) => `failed with ${error.text}`,
      Interrupted: () => "stopped",
      Died: ({ defect }) => `died with ${defect.text}`,
    }),
  )
