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
    <div className="mb-1 flex flex-col rounded-sm border border-zinc-300 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-2 flex justify-between border-b border-zinc-400 px-2 pb-1 dark:border-zinc-600">
        <h3 className="text-lg font-bold">{span.label}</h3>
        {Option.isSome(span.duration) && (
          <div>
            <span className="mr-1">Duration:</span>
            <span className="text-zinc-500 dark:text-zinc-400">
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
      <div className="mb-2 space-x-1 pl-3 text-sm">
        <span>Attributes</span>
        <span className="text-xs text-zinc-500">( {attributes.length} )</span>
      </div>
    )
  }

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex cursor-pointer items-center gap-1 bg-transparent py-0 pl-2 text-sm"
      >
        <ChevronRightIcon
          className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
        />
        <span>Attributes</span>
        <span className="text-xs text-zinc-500">( {attributes.length} )</span>
      </button>
      {open && (
        <table className="mt-1 w-full text-sm">
          <tbody>
            {attributes.map(([key, value]) => (
              <tr key={key} className="bg-zinc-100 dark:bg-zinc-700">
                <td className="px-2 py-1 font-medium">{key}</td>
                <td className="w-full px-2 py-1 text-zinc-700 dark:text-zinc-300">
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
      <div className="space-x-1 bg-zinc-100 py-1 pl-3 text-sm dark:bg-zinc-800">
        <span>Events</span>
        <span className="text-xs text-zinc-500">( {events.length} )</span>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center gap-1 bg-zinc-100 py-1 pl-2 text-sm dark:bg-zinc-800"
      >
        <ChevronRightIcon
          className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
        />
        <span>Events</span>
        <span className="text-xs text-zinc-500">( {events.length} )</span>
      </button>
      {open && (
        <div className="ml-2 py-2">
          {events.map((node, index) => (
            <TraceEvent key={index} node={node} />
          ))}
          <div className="mt-2 ml-2 text-xs text-zinc-500">
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
        className="flex cursor-pointer items-center gap-1 bg-zinc-50 p-0 text-sm dark:bg-zinc-900"
      >
        <ChevronRightIcon
          className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
        />
        <span>{eventTimestamp}</span>
        {!open && (
          <span className="ml-2 text-xs font-light">{node.event.name}</span>
        )}
      </button>
      {open && (
        <table className="mt-1 w-full text-sm">
          <tbody>
            <tr className="bg-zinc-100 dark:bg-zinc-700">
              <td className="px-2 py-1 font-medium">message</td>
              <td className="px-2 py-1">{JSON.stringify(node.event.name)}</td>
            </tr>
            {Object.entries(node.event.attributes ?? {}).map(([key, value]) => (
              <tr key={key} className="bg-zinc-100 dark:bg-zinc-700">
                <td className="px-2 py-1 font-medium">{key}</td>
                <td className="w-full px-2 py-1">{JSON.stringify(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
