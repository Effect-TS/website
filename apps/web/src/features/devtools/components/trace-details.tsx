import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Event, Span } from "../span.ts"
import { EVENT_LEVEL_COLOR, eventLevel, formatDuration } from "./utils"

/**
 * The selected span's details, shown in a column beside the waterfall (or
 * under it when the panel is narrow). Attributes and events are always open,
 * and long values wrap rather than run off the edge.
 */
export function TraceDetails({
  span,
  traceStartTime,
  onClose,
}: {
  readonly span: Span
  /** Start of the whole trace, in nanoseconds: times are relative to it. */
  readonly traceStartTime: bigint
  readonly onClose: () => void
}) {
  const attributes = Array.from(span.attributes).filter(
    ([key]) => key !== "code.stacktrace",
  )
  const stacktrace = span.attributes.get("code.stacktrace")
  const offset = Option.map(span.startTime, (start) =>
    sinceTraceStart(start, traceStartTime),
  )

  return (
    <aside
      aria-label="Span details"
      data-testid="trace-details"
      className="flex min-h-0 flex-col overflow-auto px-3 py-2.5 text-foreground"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-sm font-semibold break-all">
          {span.label}
        </h3>
        <button
          type="button"
          aria-label="Close span details"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-xs text-subtle-foreground">
        {Option.isSome(span.duration) ? (
          <span className="text-muted-foreground">
            {formatDuration(span.duration.value)}
          </span>
        ) : (
          <span className="text-muted-foreground">In progress</span>
        )}
        {Option.isSome(offset) && (
          <>
            <span aria-hidden="true">·</span>
            <span>starts at +{offset.value}</span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <span
          className={cn(
            "rounded-full border px-1.5 leading-4",
            span.hasError
              ? "border-destructive/60 text-destructive"
              : "border-brand/50 text-brand",
          )}
        >
          {span.hasError
            ? "failed"
            : Option.isSome(span.endTime)
              ? "success"
              : "running"}
        </span>
      </div>

      <SectionTitle label="Attributes" count={attributes.length} />
      {attributes.length === 0 ? (
        <Empty>No attributes</Empty>
      ) : (
        <dl
          data-testid="trace-details-attributes"
          className="grid grid-cols-[minmax(4rem,max-content)_1fr] gap-x-3 font-mono text-xs"
        >
          {attributes.map(([key, value]) => (
            <Entry key={key} name={key} value={value} />
          ))}
        </dl>
      )}

      <SectionTitle label="Events" count={span.events.length} />
      {span.events.length === 0 ? (
        <Empty>No events</Empty>
      ) : (
        <>
          <ol data-testid="trace-details-events">
            {span.events.map((event, index) => (
              <TraceEvent
                key={index}
                event={event}
                traceStartTime={traceStartTime}
              />
            ))}
          </ol>
          <p className="mt-1.5 text-xs text-subtle-foreground">
            Times are from the start of the trace.
          </p>
        </>
      )}

      {stacktrace !== undefined && (
        <>
          <SectionTitle label="Stack trace" />
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-destructive [overflow-wrap:anywhere]">
            {typeof stacktrace === "string"
              ? stacktrace
              : formatValue(stacktrace).text}
          </pre>
        </>
      )}
    </aside>
  )
}

function SectionTitle({
  label,
  count,
}: {
  readonly label: string
  readonly count?: number
}) {
  return (
    <h4 className="mt-3.5 mb-1 font-mono text-[10.5px] tracking-wider text-muted-foreground uppercase">
      {label}
      {count !== undefined && <span> · {count}</span>}
    </h4>
  )
}

function Empty({ children }: { readonly children: React.ReactNode }) {
  return <p className="text-xs text-subtle-foreground">{children}</p>
}

function Entry({
  name,
  value,
}: {
  readonly name: string
  readonly value: unknown
}) {
  return (
    <>
      <dt className="border-b border-border py-1 whitespace-nowrap text-muted-foreground">
        {name}
      </dt>
      <dd className="border-b border-border py-1">
        <Value value={value} />
      </dd>
    </>
  )
}

/** A value, colored like code: objects as indented JSON, text wrapped. */
export function Value({ value }: { readonly value: unknown }) {
  const shown = formatValue(value)
  return (
    <span
      className={cn(
        "leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]",
        shown.kind === "string" && "text-yellow-700 dark:text-yellow-200",
        shown.kind === "number" && "text-emerald-700 dark:text-emerald-300",
        shown.kind === "literal" && "text-fuchsia-700 dark:text-pink-400",
        shown.kind === "json" && "text-foreground",
      )}
    >
      {shown.text}
    </span>
  )
}

export function formatValue(value: unknown): {
  readonly kind: "string" | "number" | "literal" | "json"
  readonly text: string
} {
  switch (typeof value) {
    case "string":
      return { kind: "string", text: JSON.stringify(value) }
    case "number":
    case "bigint":
      return { kind: "number", text: String(value) }
    case "boolean":
    case "undefined":
      return { kind: "literal", text: String(value) }
    default:
      if (value === null) return { kind: "literal", text: "null" }
      try {
        return {
          kind: "json",
          text: JSON.stringify(
            value,
            (_, v: unknown) => (typeof v === "bigint" ? `${v}n` : v),
            2,
          ),
        }
      } catch {
        // Circular or otherwise unserializable.
        return { kind: "json", text: Object.prototype.toString.call(value) }
      }
  }
}

function TraceEvent({
  event,
  traceStartTime,
}: {
  readonly event: Event
  readonly traceStartTime: bigint
}) {
  const attributes = Object.entries(event.event.attributes ?? {})
  const level = eventLevel(event)
  return (
    <li className="grid grid-cols-[auto_8px_1fr] items-start gap-x-2 border-b border-border py-1.5 font-mono text-xs last:border-b-0">
      <span className="min-w-14 text-right text-subtle-foreground">
        +{sinceTraceStart(event.event.startTime, traceStartTime)}
      </span>
      <span
        aria-hidden="true"
        className={cn("mt-1.5 h-2 w-2 rotate-45", EVENT_LEVEL_COLOR[level])}
      />
      <div className="min-w-0">
        <div className="leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
          {event.name}
        </div>
        {attributes.length > 0 && (
          <dl className="mt-0.5 grid grid-cols-[max-content_1fr] gap-x-2 text-[11px] text-subtle-foreground">
            {attributes.map(([key, value]) => (
              <div key={key} className="contents">
                <dt>{key}</dt>
                <dd>
                  <Value value={value} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  )
}

const sinceTraceStart = (time: bigint, traceStartTime: bigint): string =>
  formatDuration(Duration.nanos(time - traceStartTime))
