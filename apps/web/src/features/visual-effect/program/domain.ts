import { Array, Option, Schema } from "effect"

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

export const withNotification = (
  state: RunState,
  notification: Notification,
): RunState =>
  state._tag === "Idle"
    ? state
    : { ...state, maybeNotification: Option.some(notification) }

export const start = (startedAt: number): RunState => ({
  _tag: "Running",
  startedAt,
  maybeNotification: Option.none(),
})

/** Ends a run. The notification the run showed stays. */
export const settle = (
  previous: RunState,
  outcome: Outcome,
  startedAt: number,
  endedAt: number,
): RunState => {
  const ended = {
    endedAt,
    durationMs: endedAt - startedAt,
    maybeNotification: notificationOf(previous),
  }
  switch (outcome._tag) {
    case "Succeeded":
      return { _tag: "Succeeded", value: outcome.value, ...ended }
    case "Failed":
      return { _tag: "Failed", error: outcome.error, ...ended }
    case "Interrupted":
      return { _tag: "Interrupted", ...ended }
    case "Died":
      return { _tag: "Died", defect: outcome.defect, ...ended }
  }
}

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
    ...segments.slice(0, -1),
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
): FinalizerPanel => {
  switch (event._tag) {
    case "RunStarted":
      return { status: "Active", finalizers: [] }
    case "Registered":
      return {
        ...panel,
        finalizers: [
          ...panel.finalizers,
          {
            id: event.id,
            label: event.label,
            registrationIndex: event.registrationIndex,
            registeredAt: event.at,
            phase: "Pending",
            maybeStartedAt: Option.none(),
            maybeEndedAt: Option.none(),
          },
        ],
      }
    case "Started":
      return {
        status: "Releasing",
        finalizers: Array.map(panel.finalizers, (entry) =>
          entry.id === event.id
            ? {
                ...entry,
                phase: "Running" as const,
                maybeStartedAt: Option.some(event.at),
              }
            : entry,
        ),
      }
    case "Finished": {
      const finalizers = Array.map(panel.finalizers, (entry) =>
        entry.id === event.id
          ? {
              ...entry,
              phase: event.phase,
              maybeEndedAt: Option.some(event.at),
            }
          : entry,
      )
      const isReleasing = Array.some(
        finalizers,
        ({ phase }) => phase === "Pending" || phase === "Running",
      )
      return { status: isReleasing ? "Releasing" : "Released", finalizers }
    }
    case "Reset":
      return emptyFinalizerPanel
  }
}
