import { useAtom, useAtomValue } from "@effect/atom-react"
import { Combobox } from "@base-ui/react/combobox"
import * as Option from "effect/Option"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import type { Span } from "../span.ts"
import { useTraceAtoms } from "./context.ts"
import { formatDuration, getTotalSpans, traceHasError } from "./utils"

type Status = "failed" | "running" | "succeeded"

interface TraceItem {
  readonly traceId: string
  readonly label: string
  readonly status: Status
  readonly spans: number
  readonly duration: string
}

interface TraceGroup {
  readonly value: string
  readonly items: ReadonlyArray<TraceItem>
}

const GROUPS: ReadonlyArray<readonly [Status, string]> = [
  ["failed", "Failed"],
  ["running", "Running"],
  ["succeeded", "Succeeded"],
]

const toItem = (root: Span): TraceItem => ({
  traceId: root.traceId,
  label: root.label,
  status: traceHasError(root)
    ? "failed"
    : Option.isNone(root.endTime)
      ? "running"
      : "succeeded",
  spans: getTotalSpans(root),
  duration: Option.match(root.duration, {
    onNone: () => "running",
    onSome: formatDuration,
  }),
})

/**
 * Names the shown trace with its span count and duration, and opens a
 * searchable list of the run's traces, failures first, each group in the
 * order the traces started.
 */
export function TracePicker() {
  const { rootSpansAtom, selectedSpanAtom } = useTraceAtoms()
  const roots = useAtomValue(rootSpansAtom)
  const [selected, select] = useAtom(selectedSpanAtom)

  const items = React.useMemo(
    // The store keeps the newest first; the list reads in start order.
    () => [...roots].reverse().map(toItem),
    [roots],
  )
  const groups = React.useMemo(
    (): ReadonlyArray<TraceGroup> =>
      GROUPS.map(([status, value]) => ({
        value,
        items: items.filter((item) => item.status === status),
      })).filter((group) => group.items.length > 0),
    [items],
  )
  const current = items.find((item) => item.traceId === selected?.traceId)

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-1.5 font-mono text-sm">
      <Combobox.Root<TraceItem>
        items={groups}
        value={current ?? null}
        onValueChange={(item) => {
          if (item !== null) select(item.traceId)
        }}
        itemToStringLabel={(item) => item.label}
        isItemEqualToValue={(item, value) => item.traceId === value.traceId}
        autoHighlight
      >
        <Combobox.Trigger
          aria-label="Choose a trace"
          data-testid="trace-picker"
          className="flex max-w-full min-w-0 items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-foreground transition-colors hover:border-border-strong hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-popup-open:bg-muted"
        >
          {current !== undefined && <StatusDot status={current.status} />}
          <span className="truncate">{current?.label ?? "Choose a trace"}</span>
          <ChevronDownIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner align="start" sideOffset={4} className="z-50">
            <Combobox.Popup
              aria-label="Traces"
              className="w-80 max-w-[var(--available-width)] overflow-hidden rounded-md border border-border bg-popover font-mono text-sm text-popover-foreground shadow-lg"
            >
              <div className="flex items-center gap-2 border-b border-border px-2.5">
                <SearchIcon
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                />
                <Combobox.Input
                  placeholder="Search traces"
                  className="h-9 w-full bg-transparent text-sm outline-none! placeholder:text-subtle-foreground"
                />
              </div>
              <Combobox.Empty>
                <div className="px-3 py-3 text-muted-foreground">
                  No matching traces.
                </div>
              </Combobox.Empty>
              <Combobox.List className="max-h-[min(22rem,var(--available-height))] overflow-auto overscroll-contain py-1 empty:p-0">
                {(group: TraceGroup) => (
                  <Combobox.Group key={group.value} items={group.items}>
                    <Combobox.GroupLabel className="px-3 pt-2 pb-1 text-xs tracking-wider text-muted-foreground uppercase">
                      {group.value} · {group.items.length}
                    </Combobox.GroupLabel>
                    <Combobox.Collection>
                      {(item: TraceItem) => (
                        <Combobox.Item
                          key={item.traceId}
                          value={item}
                          title={`Trace ${item.traceId}`}
                          className="grid cursor-default grid-cols-[1rem_auto_1fr_auto] items-center gap-2 px-3 py-1.5 outline-none select-none data-highlighted:bg-muted"
                        >
                          <Combobox.ItemIndicator className="col-start-1">
                            <CheckIcon
                              aria-hidden="true"
                              className="h-3.5 w-3.5 text-muted-foreground"
                            />
                          </Combobox.ItemIndicator>
                          <StatusDot
                            status={item.status}
                            className="col-start-2"
                          />
                          <span className="col-start-3 truncate">
                            {item.label}
                          </span>
                          <span className="col-start-4 text-xs text-subtle-foreground">
                            {item.duration}
                          </span>
                        </Combobox.Item>
                      )}
                    </Combobox.Collection>
                  </Combobox.Group>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {current !== undefined && (
        <span className="text-xs text-muted-foreground">
          {current.spans} {current.spans === 1 ? "span" : "spans"} ·{" "}
          {current.duration}
          {items.length > 1 && (
            <span className="text-subtle-foreground">
              {" "}
              · {items.length} traces
            </span>
          )}
        </span>
      )}
    </div>
  )
}

function StatusDot({
  status,
  className,
}: {
  readonly status: Status
  readonly className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        className,
        status === "failed" && "bg-destructive",
        status === "running" && "bg-amber-400",
        status === "succeeded" && "bg-brand",
      )}
    />
  )
}
