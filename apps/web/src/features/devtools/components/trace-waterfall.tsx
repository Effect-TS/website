import { useAtomValue } from "@effect/atom-react"
import {
  columnResizingFeature,
  columnSizingFeature,
  createExpandedRowModel,
  flexRender,
  metaHelper,
  rowExpandingFeature,
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type CellContext,
  type ColumnDef,
  type ExpandedState,
  type RowSelectionState,
} from "@tanstack/react-table"
import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import React, { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useTraceAtoms } from "./context.ts"
import { Span } from "../span.ts"
import { DetailsColumn } from "./details-column"
import { HoveredEventContext } from "./event-guide.ts"
import { TraceDetails } from "./trace-details"
import { type Timeline, TimelineContext, useTimeline } from "./timeline"
import { TraceTree } from "./trace-tree"
import { type EventLevel, eventLevel, formatDuration } from "./utils"

export const features = tableFeatures({
  columnResizingFeature,
  columnSizingFeature,
  rowExpandingFeature,
  rowSelectionFeature,
  expandedRowModel: createExpandedRowModel(),
  columnMeta: metaHelper<{ grow: boolean }>(),
})

type SpanCellContext = CellContext<typeof features, Span, unknown>

const columns: Array<ColumnDef<typeof features, Span>> = [
  {
    id: "name",
    accessorFn: (node) => node,
    header: () => (
      <h5
        role="columnheader"
        className="ml-4 font-mono text-xs tracking-wider text-muted-foreground uppercase"
      >
        Name
      </h5>
    ),
    cell: (props) => <NameCell {...props} />,
    minSize: 200,
  },
  {
    id: "span",
    accessorFn: (node) => node,
    header: () => <DurationHeader />,
    cell: (props) => <DurationCell {...props} />,
    meta: {
      grow: true,
    },
    enableResizing: false,
  },
]

export function TraceWaterfall() {
  const selectedSpan = useAtomValue(useTraceAtoms().selectedSpanAtom)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [expanded, setExpanded] = React.useState<ExpandedState>(true)
  const data = useMemo(
    () => (selectedSpan === undefined ? [] : [selectedSpan]),
    [selectedSpan],
  )

  const table = useTable({
    features,
    data,
    columns,
    state: {
      expanded,
      rowSelection,
    },
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableMultiRowSelection: false,
    enableSubRowSelection: false,
    autoResetExpanded: false,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    getSubRows: (span: Span) => span.children as Array<Span>,
  })

  // Row ids are positions in the tree, so a new trace would inherit the old
  // selection: start each trace with nothing selected.
  const traceId = selectedSpan?.traceId
  React.useEffect(() => {
    setRowSelection({})
  }, [traceId])

  const selectedRow = table
    .getRowModel()
    .flatRows.find((row) => row.getIsSelected())
  const [hoveredEvent, setHoveredEvent] = React.useState<bigint | undefined>()
  // A details panel that closes or changes span never sees the pointer leave.
  const selectedRowId = selectedRow?.id
  React.useEffect(() => {
    setHoveredEvent(undefined)
  }, [selectedRowId])
  const traceStartTime =
    selectedSpan === undefined ? Option.none() : selectedSpan.startTime
  const timeline = useTimeline(selectedSpan)

  const columnSizeVars = React.useMemo(() => {
    const headers = table.getFlatHeaders()
    const colSizes: { [key: string]: number } = {}
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!
      colSizes[`--header-${header.id}-size`] = header.getSize()
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize()
    }
    return colSizes
  }, [table.state.columnResizing, table.state.columnSizing])

  return (
    // Details sit beside the waterfall, or under it when the panel is narrow.
    <div className="@container flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col @2xl:flex-row">
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          <TimelineContext.Provider value={timeline}>
            <HoveredEventContext.Provider value={hoveredEvent}>
              <table
                style={columnSizeVars as any}
                className="w-full border-collapse border-spacing-0"
              >
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="sticky top-0 z-10 flex border-b border-border bg-background"
                    >
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          style={{
                            width: `calc(var(--header-${header?.id}-size) * 1px)`,
                          }}
                          className={cn(
                            "grid h-8 grid-cols-[minmax(150px,1fr)_8px] items-center p-0 text-left font-normal",
                            header.column.columnDef.meta?.grow && "grow",
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                          {header.column.getCanResize() && (
                            <div
                              role="separator"
                              aria-label="drag to resize"
                              onDoubleClick={() => header.column.resetSize()}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className="h-full w-px cursor-ew-resize border-l border-border px-0.75 transition-colors hover:border-brand"
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => {
                      const span = row.getValue<Span>("span")
                      return (
                        <tr
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className={cn(
                            "flex border-b border-border transition-colors hover:bg-muted/40 data-[state=selected]:bg-card",
                            span.hasError &&
                              "bg-destructive/10 hover:bg-destructive/15 data-[state=selected]:bg-destructive/10",
                          )}
                        >
                          {row.getAllCells().map((cell) => (
                            <td
                              key={cell.id}
                              style={{
                                width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                              }}
                              className={cn(
                                "grid min-h-8 grid-cols-[minmax(150px,1fr)_8px] items-center p-0",
                                cell.column.columnDef.meta?.grow && "grow",
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                              {cell.column.getCanResize() && (
                                <div
                                  role="separator"
                                  className="h-full w-px border-l border-border px-0.75"
                                />
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="h-24 w-auto text-center text-sm text-muted-foreground"
                      >
                        No spans yet. Run your code to see a trace.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </HoveredEventContext.Provider>
          </TimelineContext.Provider>
        </div>
        {selectedRow !== undefined && Option.isSome(traceStartTime) && (
          <DetailsColumn>
            <TraceDetails
              span={selectedRow.original}
              traceStartTime={traceStartTime.value}
              onClose={() => setRowSelection({})}
              onHoverEvent={setHoveredEvent}
            />
          </DetailsColumn>
        )}
      </div>
    </div>
  )
}

function NameCell({ getValue, row }: SpanCellContext) {
  const node = getValue<Span>()
  return (
    <div className="ml-2 flex h-full items-start overflow-hidden text-sm text-ellipsis whitespace-nowrap text-foreground">
      <button
        type="button"
        className="flex h-full items-start bg-transparent p-0"
        onClick={row.getToggleExpandedHandler()}
      >
        <TraceTree row={row} />
      </button>
      <div
        className={cn(
          "flex h-8 items-center",
          row.subRows.length > 0 && "ml-1.5",
        )}
      >
        <span className="overflow-hidden font-mono text-xs text-ellipsis">
          {node.label}
        </span>
      </div>
    </div>
  )
}

function DurationCell({ getValue, row }: SpanCellContext) {
  const currentSpan = getValue<Span>()
  const timeline = React.useContext(TimelineContext)

  if (timeline === undefined) {
    return null
  }

  if (currentSpan.span._tag === "ExternalSpan") {
    return (
      <div className="px-2 font-mono text-xs text-subtle-foreground">
        &lt;&lt; External Span &gt;&gt;
      </div>
    )
  }

  const traceStartTime = timeline.start
  const pillColors = getPillColors(currentSpan)
  const spanStartTime = Option.getOrThrow(currentSpan.startTime)
  // A running span reaches the present; one left running after its trace
  // ended reaches the end of the axis.
  const running = Option.isNone(currentSpan.endTime)
  const spanEndTime = Option.getOrElse(
    currentSpan.endTime,
    () => timeline.now ?? timeline.start + BigInt(timeline.length),
  )
  const spanNanos = Math.max(0, Number(spanEndTime - spanStartTime))
  const spanDuration = Duration.nanos(BigInt(spanNanos))
  const rootNanos = timeline.length

  const startNanos = Number(spanStartTime - traceStartTime)
  const left = `${(startNanos / rootNanos) * 100}%`
  const width = `${(spanNanos / rootNanos) * 100}%`

  return (
    <div className="relative h-8 w-full">
      <EventGuide traceStartTime={traceStartTime} rootNanos={rootNanos} />
      <NowLine timeline={timeline} />
      <button
        type="button"
        aria-label={`Show details of ${currentSpan.label}`}
        aria-pressed={row.getIsSelected()}
        data-running={running || undefined}
        style={{ left, width, ...(running ? RUNNING_STRIPES : {}) }}
        className={cn(
          "absolute top-1 flex h-6 min-w-1 cursor-pointer items-center rounded-sm border bg-transparent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          running
            ? "border-r-0 border-amber-500/70 hover:border-amber-500"
            : currentSpan.hasError
              ? "border-destructive/60 bg-destructive/20 hover:bg-destructive/30"
              : "border-brand/50 bg-brand/15 hover:bg-brand/25",
          row.getIsSelected() &&
            (running
              ? "border-amber-500"
              : currentSpan.hasError
                ? "border-destructive bg-destructive/30"
                : "border-brand bg-brand/30"),
        )}
        onClick={row.getToggleSelectedHandler()}
      >
        <span
          className={cn("ml-2 font-mono text-xs whitespace-nowrap", pillColors)}
        >
          {formatDuration(spanDuration)}
          {running && "…"}
        </span>
        <EventMarkers
          span={currentSpan}
          spanStartTime={spanStartTime}
          spanNanos={spanNanos}
          traceStartTime={traceStartTime}
        />
      </button>
    </div>
  )
}

/**
 * A hairline through the span's bar for each event (logs, mostly), at the
 * moment it happened. Hovering one shows its time and message.
 */
function EventMarkers({
  span,
  spanStartTime,
  spanNanos,
  traceStartTime,
}: {
  readonly span: Span
  readonly spanStartTime: bigint
  readonly spanNanos: number
  readonly traceStartTime: bigint
}) {
  if (span.events.length === 0) return null
  return span.events.map((event, index) => {
    const at = Number(event.event.startTime - spanStartTime)
    const fraction =
      spanNanos === 0 ? 0 : Math.min(1, Math.max(0, at / spanNanos))
    const since = formatDuration(
      Duration.nanos(event.event.startTime - traceStartTime),
    )
    return (
      <span
        key={index}
        data-testid="trace-event-marker"
        title={`+${since} ${event.name}`}
        style={{ left: `${fraction * 100}%` }}
        className={cn(
          // A wider hit area than the 1px line, for hovering.
          "absolute inset-y-0.5 -ml-1 w-2 before:absolute before:inset-y-0 before:left-1 before:w-px",
          TICK_COLOR[eventLevel(event)],
        )}
      />
    )
  })
}

/** Diagonal amber stripes: a span that hasn't ended yet. */
const RUNNING_STRIPES: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(-45deg, color-mix(in oklab, var(--color-amber-400) 24%, transparent) 0 6px, color-mix(in oklab, var(--color-amber-400) 8%, transparent) 6px 12px)",
}

/**
 * The present, while the trace runs: a dashed line down this row, which the
 * rows above and below continue.
 */
function NowLine({ timeline }: { readonly timeline: Timeline }) {
  if (timeline.now === undefined || timeline.length <= 0) return null
  const fraction = Number(timeline.now - timeline.start) / timeline.length
  return (
    <span
      aria-hidden="true"
      data-testid="trace-now-line"
      style={{ left: `${Math.min(1, Math.max(0, fraction)) * 100}%` }}
      className="pointer-events-none absolute -top-px -bottom-px z-10 w-0 border-l border-dashed border-amber-500"
    />
  )
}

const TICK_COLOR: Record<EventLevel, string> = {
  info: "before:bg-foreground/50",
  warn: "before:bg-amber-400",
  error: "before:bg-destructive",
}

/**
 * The guide for the event hovered in the span details: a line down this row
 * at that moment, which the rows above and below continue.
 */
function EventGuide({
  traceStartTime,
  rootNanos,
}: {
  readonly traceStartTime: bigint
  readonly rootNanos: number
}) {
  const hovered = React.useContext(HoveredEventContext)
  if (hovered === undefined || rootNanos <= 0) return null
  const fraction = Number(hovered - traceStartTime) / rootNanos
  return (
    <span
      aria-hidden="true"
      data-testid="trace-event-guide"
      style={{ left: `${Math.min(1, Math.max(0, fraction)) * 100}%` }}
      className="pointer-events-none absolute -top-px -bottom-px z-10 w-px bg-brand"
    />
  )
}

/**
 * The Duration header. It labels the hovered event's time and, while the
 * trace runs, the present and the length of the axis.
 */
function DurationHeader() {
  const timeline = React.useContext(TimelineContext)
  const hovered = React.useContext(HoveredEventContext)
  const at = (time: bigint) => {
    if (timeline === undefined) return undefined
    const fraction =
      timeline.length <= 0 ? 0 : Number(time - timeline.start) / timeline.length
    return {
      left: `${Math.min(1, Math.max(0, fraction)) * 100}%`,
      text: `+${formatDuration(Duration.nanos(time - timeline.start))}`,
    }
  }
  const label = hovered === undefined ? undefined : at(hovered)
  const now = timeline?.now === undefined ? undefined : at(timeline.now)
  return (
    <div className="relative flex h-full grow items-center">
      <h5
        role="columnheader"
        className="ml-2 font-mono text-xs tracking-wider text-muted-foreground uppercase"
      >
        Duration
      </h5>
      {now !== undefined && timeline !== undefined && (
        <>
          <span
            data-testid="trace-now-label"
            style={{ left: now.left }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-sm bg-amber-400 px-1 font-mono text-[11px] whitespace-nowrap text-zinc-950"
          >
            now {now.text}
          </span>
          <span className="pointer-events-none absolute right-2 font-mono text-[11px] text-subtle-foreground">
            {formatDuration(Duration.nanos(BigInt(timeline.length)))}
          </span>
        </>
      )}
      {label !== undefined && (
        <span
          data-testid="trace-event-guide-label"
          style={{ left: label.left }}
          className="pointer-events-none absolute z-20 -translate-x-1/2 bg-background px-1 font-mono text-[11px] text-brand"
        >
          {label.text}
        </span>
      )}
    </div>
  )
}

function getPillColors(span: Span) {
  if (span.hasError) {
    return "text-destructive"
  }
  return "text-foreground"
}
