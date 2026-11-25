import * as Option from "effect/Option"
import * as React from "react"
import type { Span } from "../span.ts"

/** The waterfall's time axis, in nanoseconds since the epoch. */
export interface Timeline {
  readonly start: bigint
  /** How much time the axis spans, in nanoseconds. */
  readonly length: number
  /** The present, while the trace is still running. */
  readonly now: bigint | undefined
}

export const TimelineContext = React.createContext<Timeline | undefined>(
  undefined,
)

/** How often a running trace's waterfall redraws. */
const TICK_MS = 250

/**
 * The axis length for a running trace that has run for `elapsed`
 * nanoseconds: the next round length (1, 2 or 5 times a power of ten) with a
 * little room to spare, so the axis holds still until "now" nears its end.
 */
export const runningScale = (elapsed: number): number => {
  const target = Math.max(1, elapsed * 1.05)
  const power = 10 ** Math.floor(Math.log10(target))
  for (const step of [1, 2, 5, 10]) {
    if (step * power >= target) return step * power
  }
  return 10 * power
}

/** The latest moment the trace reports: a span starting or ending, or an event. */
const latestTime = (span: Span): bigint => {
  let latest = 0n
  const visit = (node: Span) => {
    for (const time of [node.startTime, node.endTime]) {
      if (Option.isSome(time) && time.value > latest) latest = time.value
    }
    for (const event of node.events) {
      if (event.event.startTime > latest) latest = event.event.startTime
    }
    node.children.forEach(visit)
  }
  visit(span)
  return latest
}

const wallClockNanos = (): bigint =>
  BigInt(Math.round((performance.timeOrigin + performance.now()) * 1_000_000))

/**
 * The axis for a trace: exactly its duration once it has ended. While it
 * runs, a round length that grows in steps, and the present, updated a few
 * times a second. The present is never earlier than the trace's latest
 * report, in case the program's clock runs ahead of the page's.
 */
export function useTimeline(root: Span | undefined): Timeline | undefined {
  const running = root !== undefined && Option.isNone(root.endTime)
  const [clock, setClock] = React.useState(wallClockNanos)
  React.useEffect(() => {
    if (!running) return
    setClock(wallClockNanos())
    const timer = setInterval(() => setClock(wallClockNanos()), TICK_MS)
    return () => clearInterval(timer)
  }, [running])

  if (root === undefined || Option.isNone(root.startTime)) return undefined
  const start = root.startTime.value
  if (Option.isSome(root.endTime)) {
    return { start, length: Number(root.endTime.value - start), now: undefined }
  }
  const latest = latestTime(root)
  const now = clock > latest ? clock : latest
  return { start, length: runningScale(Number(now - start)), now }
}
