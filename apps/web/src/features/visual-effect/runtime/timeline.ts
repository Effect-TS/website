import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import type { ExampleDefinition } from "@/features/visual-effect/model/example-definition"
import {
  makeTimelineSegment,
  type VisualEffectScheduleTimeline,
  type VisualEffectState,
} from "@/features/visual-effect/model/domain"
import { ExampleStep } from "@/features/visual-effect/model/example-definition"
import {
  exampleStateAtom,
  scheduleTimeAtom,
  scheduleTimelineAtom,
} from "./state"

interface Registry {
  readonly get: <A>(atom: Atom.Atom<A>) => A
  readonly set: <R, W>(atom: Atom.Writable<R, W>, value: W) => void
  readonly update: <R, W>(
    atom: Atom.Writable<R, W>,
    update: (value: R) => W,
  ) => void
}

interface ClockLike {
  readonly currentTimeMillisUnsafe: () => number
}

export const updateScheduleTimeline = (
  registry: Registry,
  details: ExampleStep["Service"],
  state: VisualEffectState,
): void => {
  const exampleState = registry.get(exampleStateAtom(details.definition))

  if (exampleState._tag !== "Running" || state._tag === "Idle") {
    return
  }

  registry.update(
    scheduleTimelineAtom(details.definition),
    (segments: VisualEffectScheduleTimeline) => {
      if (Array.isReadonlyArrayNonEmpty(segments)) {
        const previousSegment = segments[segments.length - 1]

        if (previousSegment === undefined) {
          return segments
        }

        const nextSegmentKind = state._tag === "Running" ? "Running" : "Waiting"

        if (previousSegment.kind === nextSegmentKind) {
          return segments
        }

        const transitionTime =
          state._tag === "Running" ? state.startedAt : state.endedAt
        const nextSegment = makeTimelineSegment(nextSegmentKind, transitionTime)
        previousSegment.endedAt = transitionTime

        return Array.append(segments, nextSegment)
      }

      const kind = state._tag === "Running" ? "Running" : "Waiting"
      return Array.of(makeTimelineSegment(kind, exampleState.startedAt))
    },
  )
}

export const scheduleTimer = (
  clock: ClockLike,
  registry: Registry,
  example: ExampleDefinition,
) =>
  Effect.callback((_resume) => {
    let frame = 0

    const tickScheduleTimer = () => {
      registry.set(scheduleTimeAtom(example), clock.currentTimeMillisUnsafe())
      frame = globalThis.requestAnimationFrame(tickScheduleTimer)
    }

    tickScheduleTimer()

    return Effect.sync(() => {
      globalThis.cancelAnimationFrame(frame)
      registry.set(scheduleTimeAtom(example), 0)
    })
  })
