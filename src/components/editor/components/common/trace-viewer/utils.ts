import { SpanNode } from "@/workspaces/services/TraceProvider"
import { Duration } from "effect"

export function getTotalSpans(
  trace: SpanNode,
  getChildren: (node: SpanNode) => ReadonlyArray<SpanNode>
): number {
  let total = 1
  const stack = [trace]
  while (stack.length > 0) {
    const node = stack.pop()!
    const children = getChildren(node)
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
  const nanos = Number(Duration.unsafeToNanos(duration))
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
