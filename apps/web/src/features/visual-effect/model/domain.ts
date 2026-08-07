import type * as React from "react"
import * as Data from "effect/Data"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import { constFalse, constTrue } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"

const RenderableResultSymbol = Symbol.for("renderable-result")

export abstract class RenderableResult {
  readonly [RenderableResultSymbol] = RenderableResultSymbol

  static is(u: unknown): u is RenderableResult {
    return Predicate.hasProperty(u, RenderableResultSymbol)
  }

  abstract render(): React.ReactNode
}

export interface VisualEffectNotification {
  readonly id: string
  readonly message: string
  readonly duration: Duration.Duration
  readonly showOnHover: boolean
}

export type VisualEffectState = Data.TaggedEnum<{
  readonly Idle: {}
  readonly Running: {
    readonly startedAt: DateTime.Utc
    readonly notification: Option.Option<VisualEffectNotification>
  }
  readonly Succeeded: {
    readonly value: RenderableResult
    readonly endedAt: DateTime.Utc
    readonly duration: Duration.Duration
    readonly notification: Option.Option<VisualEffectNotification>
  }
  readonly Failed: {
    readonly error: RenderableResult
    readonly endedAt: DateTime.Utc
    readonly duration: Duration.Duration
    readonly notification: Option.Option<VisualEffectNotification>
  }
  readonly Interrupted: {
    readonly endedAt: DateTime.Utc
    readonly duration: Duration.Duration
    readonly notification: Option.Option<VisualEffectNotification>
  }
  readonly Died: {
    readonly defect: RenderableResult
    readonly endedAt: DateTime.Utc
    readonly duration: Duration.Duration
    readonly notification: Option.Option<VisualEffectNotification>
  }
}>
export const VisualEffectState = Data.taggedEnum<VisualEffectState>()

export const InitialState: VisualEffectState = VisualEffectState.Idle()

export const canReset = VisualEffectState.$match({
  Idle: constFalse,
  Running: constFalse,
  Succeeded: constTrue,
  Interrupted: constTrue,
  Failed: constTrue,
  Died: constTrue,
})

export type VisualEffectScheduleTimeline = ReadonlyArray<TimelineSegment>

export type TimelineSegmentKind = "Running" | "Waiting"

export type TimelineSegment = {
  readonly id: string
  readonly kind: TimelineSegmentKind
  readonly startedAt: DateTime.Utc
  endedAt: DateTime.Utc | undefined
}

export const makeTimelineSegment = (
  kind: TimelineSegmentKind,
  startedAt: DateTime.Utc,
): TimelineSegment => ({
  id: crypto.randomUUID(),
  kind,
  startedAt,
  endedAt: undefined,
})

export type VisualFinalizerPhase =
  | "Pending"
  | "Running"
  | "Succeeded"
  | "Failed"
  | "Interrupted"

export type VisualFinalizerStatus = "Idle" | "Active" | "Releasing" | "Released"

export interface VisualFinalizerEntry {
  readonly id: string
  readonly label: string
  readonly registrationIndex: number
  readonly registeredAt: DateTime.Utc
  readonly phase: VisualFinalizerPhase
  readonly startedAt: DateTime.Utc | undefined
  readonly endedAt: DateTime.Utc | undefined
}

export interface VisualFinalizerState {
  readonly runId: number
  readonly status: VisualFinalizerStatus
  readonly finalizers: ReadonlyArray<VisualFinalizerEntry>
}

export const InitialFinalizerPanelState: VisualFinalizerState = {
  runId: 0,
  status: "Idle",
  finalizers: [],
}

export type VisualFinalizerEvent =
  | {
      readonly _tag: "RunStarted"
      readonly runId: number
    }
  | {
      readonly _tag: "Registered"
      readonly runId: number
      readonly id: string
      readonly label: string
      readonly registrationIndex: number
      readonly at: DateTime.Utc
    }
  | {
      readonly _tag: "Started"
      readonly runId: number
      readonly id: string
      readonly at: DateTime.Utc
    }
  | {
      readonly _tag: "Finished"
      readonly runId: number
      readonly id: string
      readonly at: DateTime.Utc
      readonly phase: Exclude<VisualFinalizerPhase, "Pending" | "Running">
    }
  | {
      readonly _tag: "Reset"
      readonly runId: number
    }

export const reduceFinalizerPanel = (
  state: VisualFinalizerState,
  event: VisualFinalizerEvent,
): VisualFinalizerState => {
  if (
    event._tag !== "RunStarted" &&
    event._tag !== "Reset" &&
    event.runId !== state.runId
  ) {
    return state
  }

  switch (event._tag) {
    case "RunStarted":
      return {
        runId: event.runId,
        status: "Active",
        finalizers: [],
      }
    case "Registered":
      return {
        ...state,
        finalizers: [
          ...state.finalizers,
          {
            id: event.id,
            label: event.label,
            registrationIndex: event.registrationIndex,
            registeredAt: event.at,
            phase: "Pending",
            startedAt: undefined,
            endedAt: undefined,
          },
        ],
      }
    case "Started":
      return {
        ...state,
        status: "Releasing",
        finalizers: state.finalizers.map((finalizer) =>
          finalizer.id === event.id
            ? {
                ...finalizer,
                phase: "Running",
                startedAt: event.at,
              }
            : finalizer,
        ),
      }
    case "Finished": {
      const nextFinalizers = state.finalizers.map((finalizer) =>
        finalizer.id === event.id
          ? {
              ...finalizer,
              phase: event.phase,
              endedAt: event.at,
            }
          : finalizer,
      )
      const hasActiveFinalizers = nextFinalizers.some(
        (finalizer) =>
          finalizer.phase === "Pending" || finalizer.phase === "Running",
      )
      return {
        ...state,
        status: hasActiveFinalizers ? "Releasing" : "Released",
        finalizers: nextFinalizers,
      }
    }
    case "Reset":
      return {
        runId: event.runId,
        status: "Idle",
        finalizers: [],
      }
  }
}
