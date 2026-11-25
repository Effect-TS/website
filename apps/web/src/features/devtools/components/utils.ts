import * as Duration from "effect/Duration"
import { Event, Span } from "../span.ts"

export function getTotalSpans(span: Span): number {
  let total = 1
  const stack = [span]
  while (stack.length > 0) {
    const node = stack.pop()!
    const children = node.children
    if (children.length > 0) {
      total += children.length
      for (const child of children) {
        stack.push(child)
      }
    }
  }
  return total
}

export function formatDuration(duration: Duration.Duration) {
  const nanos = Number(Duration.toNanosUnsafe(duration))
  if (nanos < 1_000) {
    return `${nanos}ns`
  } else if (nanos < 1_000_000) {
    return `${(nanos / 1_000).toFixed(2)}µs`
  } else if (nanos < 1_000_000_000) {
    return `${(nanos / 1_000_000).toFixed(2)}ms`
  } else {
    return `${(nanos / 1_000_000_000).toFixed(2)}s`
  }
}

export type EventLevel = "info" | "warn" | "error"

/** Background class of an event's diamond, by level. */
export const EVENT_LEVEL_COLOR: Record<EventLevel, string> = {
  info: "bg-blue-400",
  warn: "bg-amber-400",
  error: "bg-destructive",
}

/**
 * How loud an event is, from the log level Effect records on log events
 * (`effect.logLevel`). Events that aren't logs count as info.
 */
export function eventLevel(event: Event): EventLevel {
  const level = event.event.attributes?.["effect.logLevel"]
  switch (level) {
    case "WARN":
    case "WARNING":
      return "warn"
    case "ERROR":
    case "FATAL":
      return "error"
    default:
      return "info"
  }
}
