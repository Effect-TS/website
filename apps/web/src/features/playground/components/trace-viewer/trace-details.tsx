import { useAtomValue } from "@effect/atom-react"
import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import { ChevronRightIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { selectedSpanAtom } from "../../atoms/devtools"
import { Event, Span } from "../../domain/devtools"
import { formatDuration } from "./utils"

export function TraceDetails({ span }: { readonly span: Span }) {
  return (
    <div className="my-1 mr-4 flex flex-col rounded-md border border-border bg-card p-3 text-foreground">
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h3 className="font-mono text-sm font-semibold">{span.label}</h3>
        {Option.isSome(span.duration) && (
          <div className="font-mono text-xs">
            <span className="mr-1 text-subtle-foreground">Duration</span>
            <span className="text-muted-foreground">
              {formatDuration(span.duration.value)}
            </span>
          </div>
        )}
      </div>
      <TraceAttributes attributes={Array.from(span.attributes)} />
      <TraceEvents events={span.events} />
    </div>
  )
}

function TraceAttributes({
  attributes,
}: {
  readonly attributes: ReadonlyArray<[string, unknown]>
}) {
  const [open, setOpen] = useState(false)

  if (attributes.length === 0) {
    return (
      <div className="mb-2 space-x-1 pl-5 text-sm text-muted-foreground">
        <span>Attributes</span>
        <span className="font-mono text-xs text-subtle-foreground">
          ( {attributes.length} )
        </span>
      </div>
    )
  }

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex cursor-pointer items-center gap-1 bg-transparent py-0 pl-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRightIcon
          className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
        />
        <span>Attributes</span>
        <span className="font-mono text-xs text-subtle-foreground">
          ( {attributes.length} )
        </span>
      </button>
      {open && (
        <table className="mt-1 w-full text-sm">
          <tbody>
            {attributes.map(([key, value]) => (
              <tr key={key} className="border-b border-border last:border-0">
                <td className="px-2 py-1 font-mono text-xs text-muted-foreground">
                  {key}
                </td>
                <td className="w-full px-2 py-1 font-mono text-xs text-foreground">
                  {JSON.stringify(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function TraceEvents({ events }: { readonly events: ReadonlyArray<Event> }) {
  const [open, setOpen] = useState(false)

  if (events.length === 0) {
    return (
      <div className="space-x-1 rounded-sm bg-muted/40 py-1 pl-5 text-sm text-muted-foreground dark:bg-card/40">
        <span>Events</span>
        <span className="font-mono text-xs text-subtle-foreground">
          ( {events.length} )
        </span>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center gap-1 rounded-sm bg-muted/40 py-1 pl-2 text-sm text-muted-foreground transition-colors hover:text-foreground dark:bg-card/40"
      >
        <ChevronRightIcon
          className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
        />
        <span>Events</span>
        <span className="font-mono text-xs text-subtle-foreground">
          ( {events.length} )
        </span>
      </button>
      {open && (
        <div className="ml-2 py-2">
          {events.map((node, index) => (
            <TraceEvent key={index} node={node} />
          ))}
          <div className="mt-2 ml-2 text-xs text-subtle-foreground">
            Log timestamps are relative to the start time of the full trace.
          </div>
        </div>
      )}
    </div>
  )
}

function TraceEvent({ node }: { readonly node: Event }) {
  const selectedSpan = useAtomValue(selectedSpanAtom)
  const [open, setOpen] = useState(false)
  const eventTimestamp = useMemo(() => {
    if (selectedSpan !== undefined) {
      const traceStartTime = Option.getOrThrow(selectedSpan.startTime)
      const eventStartTime = Duration.nanos(node.event.startTime)
      const relativeTimestamp = Duration.subtract(
        eventStartTime,
        Duration.nanos(traceStartTime),
      )
      return formatDuration(relativeTimestamp)
    }
    return ""
  }, [node.event.startTime, selectedSpan])

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex cursor-pointer items-center gap-1 bg-transparent p-0 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRightIcon
          className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
        />
        <span>{eventTimestamp}</span>
        {!open && (
          <span className="ml-2 text-subtle-foreground">{node.event.name}</span>
        )}
      </button>
      {open && (
        <table className="mt-1 w-full text-sm">
          <tbody>
            <tr className="border-b border-border">
              <td className="px-2 py-1 font-mono text-xs text-muted-foreground">
                message
              </td>
              <td className="px-2 py-1 font-mono text-xs text-foreground">
                {JSON.stringify(node.event.name)}
              </td>
            </tr>
            {Object.entries(node.event.attributes ?? {}).map(([key, value]) => (
              <tr key={key} className="border-b border-border last:border-0">
                <td className="px-2 py-1 font-mono text-xs text-muted-foreground">
                  {key}
                </td>
                <td className="w-full px-2 py-1 font-mono text-xs text-foreground">
                  {JSON.stringify(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
