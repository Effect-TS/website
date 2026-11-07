import { Array, Option } from "effect"
import type { RunState, TimelineSegment } from "./domain"

export const TIMELINE = {
  cursorWidth: 3,
  dotSize: 12,
  lineDotGap: 1,
  height: 50,
  lineThickness: 3,
  pixelsPerSecond: 100,
  scrollBuffer: 240,
  scrollThreshold: 0.8,
  startOffset: 50,
  tickMarkSpacing: 50,
} as const

export interface TimelineInput {
  readonly run: RunState
  readonly segments: ReadonlyArray<TimelineSegment>
  readonly clock: number
  readonly containerWidth: number
}

const endedAtOf = (segment: TimelineSegment): number =>
  Option.getOrElse(segment.maybeEndedAt, () => segment.startedAt)

/** Where "now" is on the clock. Once a run ends, now is the end. */
const currentTimeOf = ({ run, segments, clock }: TimelineInput): number => {
  if (run._tag === "Running") {
    return clock
  }
  if (run._tag !== "Idle") {
    return run.endedAt
  }
  return Option.match(Array.last(segments), {
    onNone: () => clock,
    onSome: endedAtOf,
  })
}

const originOf = (input: TimelineInput, now: number): number => {
  if (input.run._tag === "Running") {
    return input.run.startedAt
  }
  return Option.match(Array.head(input.segments), {
    onNone: () => now,
    onSome: ({ startedAt }) => startedAt,
  })
}

const xOf = (time: number, origin: number): number =>
  ((time - origin) / 1_000) * TIMELINE.pixelsPerSecond + TIMELINE.startOffset

export interface SegmentLayout {
  readonly kind: TimelineSegment["kind"]
  readonly isActive: boolean
  readonly isEnded: boolean
  readonly durationMs: number
  readonly left: number
  readonly width: number
  readonly visibleLeft: number
  readonly visibleWidth: number
}

export interface TimelineLayout {
  readonly cursorLeft: number
  readonly tickLefts: ReadonlyArray<number>
  readonly segments: ReadonlyArray<SegmentLayout>
}

export const layoutTimeline = (input: TimelineInput): TimelineLayout => {
  const now = currentTimeOf(input)
  const origin = originOf(input, now)
  const cursor =
    input.run._tag === "Idle" ? TIMELINE.startOffset : xOf(now, origin)
  const scrollOffset =
    input.containerWidth <= 0
      ? 0
      : Math.max(0, cursor - input.containerWidth * TIMELINE.scrollThreshold)
  const totalWidth = input.containerWidth + scrollOffset + TIMELINE.scrollBuffer
  const tickCount = Math.max(
    0,
    Math.ceil(totalWidth / TIMELINE.tickMarkSpacing),
  )
  const dotInset = TIMELINE.dotSize / 2 + TIMELINE.lineDotGap

  return {
    cursorLeft: cursor - scrollOffset,
    tickLefts: Array.makeBy(
      tickCount,
      (index) => (index + 1) * TIMELINE.tickMarkSpacing - scrollOffset,
    ),
    segments: Array.map(input.segments, (segment) => {
      const isEnded = Option.isSome(segment.maybeEndedAt)
      const endedAt = Option.getOrElse(segment.maybeEndedAt, () => now)
      const startX = xOf(segment.startedAt, origin)
      const endX = xOf(endedAt, origin)
      const left = startX - scrollOffset
      const width = Math.max(0, endX - startX)
      const isRunning = segment.kind === "Running"
      return {
        kind: segment.kind,
        isActive: !isEnded && input.run._tag === "Running",
        isEnded,
        durationMs: endedAt - segment.startedAt,
        left,
        width,
        visibleLeft: isRunning ? left + dotInset : left,
        visibleWidth: isRunning
          ? Math.max(0, width - dotInset - (isEnded ? dotInset : 0))
          : width,
      }
    }),
  }
}
