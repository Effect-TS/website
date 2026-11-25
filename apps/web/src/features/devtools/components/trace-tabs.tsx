import { useAtom, useAtomValue } from "@effect/atom-react"
import * as Option from "effect/Option"
import * as React from "react"
import { cn } from "@/lib/utils"
import type { Span } from "../span.ts"
import { useTraceAtoms } from "./context.ts"
import { formatDuration, getTotalSpans, traceHasError } from "./utils"

/**
 * One tab per trace, in the order the traces started, named by the root span
 * with its span count and duration. A red dot marks a trace with a failed
 * span. With a single trace the one tab doubles as its summary.
 */
export function TraceTabs() {
  const { rootSpansAtom, selectedSpanAtom } = useTraceAtoms()
  const roots = useAtomValue(rootSpansAtom)
  const [selected, select] = useAtom(selectedSpanAtom)
  // The store keeps the newest first; tabs read left to right in time.
  const traces = React.useMemo(() => [...roots].reverse(), [roots])
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [selected?.traceId])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    // Move from the focused tab, which is the selected one unless the
    // pointer focused another without clicking.
    const from =
      (event.target as HTMLElement).dataset.traceId ?? selected?.traceId
    const index = traces.findIndex((trace) => trace.traceId === from)
    const next =
      event.key === "Home"
        ? traces[0]
        : event.key === "End"
          ? traces.at(-1)
          : step === 0
            ? undefined
            : traces[index + step]
    if (next === undefined) return
    event.preventDefault()
    select(next.traceId)
    listRef.current
      ?.querySelector<HTMLElement>(`[data-trace-id="${next.traceId}"]`)
      ?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Traces"
      data-testid="trace-tabs"
      onKeyDown={onKeyDown}
      className="flex shrink-0 overflow-x-auto border-b border-border [scrollbar-width:thin]"
    >
      {traces.map((trace) => (
        <TraceTab
          key={trace.traceId}
          trace={trace}
          selected={trace.traceId === selected?.traceId}
          onSelect={() => select(trace.traceId)}
        />
      ))}
    </div>
  )
}

function TraceTab({
  trace,
  selected,
  onSelect,
}: {
  readonly trace: Span
  readonly selected: boolean
  readonly onSelect: () => void
}) {
  const spans = getTotalSpans(trace)
  const failed = traceHasError(trace)
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      data-trace-id={trace.traceId}
      title={`Trace ${trace.traceId}`}
      onClick={onSelect}
      className={cn(
        "-mb-px flex shrink-0 items-center gap-2 border-r border-b-2 border-r-border px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors focus-visible:bg-muted focus-visible:outline-none",
        selected
          ? "border-b-brand bg-card text-foreground"
          : "border-b-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          failed ? "bg-destructive" : "bg-brand",
        )}
      />
      {failed && <span className="sr-only">Failed:</span>}
      <span>{trace.label}</span>
      <span className="text-subtle-foreground">
        {spans} {spans === 1 ? "span" : "spans"} ·{" "}
        {Option.match(trace.duration, {
          onNone: () => "running",
          onSome: formatDuration,
        })}
      </span>
    </button>
  )
}
