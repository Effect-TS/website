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
import { selectedSpanAtom } from "../../atoms/devtools"
import { Span } from "../../domain/devtools"
import { TraceDetails } from "./trace-details"
import { TraceTree } from "./trace-tree"
import { formatDuration } from "./utils"

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
        className="ml-4 font-mono text-xs tracking-wider text-subtle-foreground uppercase"
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
    header: () => (
      <h5
        role="columnheader"
        className="ml-2 grow font-mono text-xs tracking-wider text-subtle-foreground uppercase"
      >
        Duration
      </h5>
    ),
    cell: (props) => <DurationCell {...props} />,
    meta: {
      grow: true,
    },
    enableResizing: false,
  },
]

export function TraceWaterfall() {
  const selectedSpan = useAtomValue(selectedSpanAtom)
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
    enableSubRowSelection: false,
    autoResetExpanded: false,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    getSubRows: (span: Span) => span.children as Array<Span>,
  })

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
    <div className="min-h-0 flex-1 overflow-auto">
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

function DurationCell({ getValue, row, column }: SpanCellContext) {
  const currentSpan = getValue<Span>()
  const root = currentSpan.isRoot
    ? currentSpan
    : row.getParentRows()[0]?.original

  if (root === undefined) {
    return null
  }

  if (currentSpan.span._tag === "ExternalSpan") {
    return (
      <div className="px-2 font-mono text-xs text-subtle-foreground">
        &lt;&lt; External Span &gt;&gt;
      </div>
    )
  }

  const traceStartTime = Option.getOrThrow(root.startTime)

  const pillColors = getPillColors(currentSpan)

  if (
    Option.isSome(currentSpan.startTime) &&
    Option.isNone(currentSpan.endTime)
  ) {
    const spanStartTime = currentSpan.startTime.value
    const relativeStartTime = Duration.nanos(spanStartTime - traceStartTime)
    return (
      <div
        className={cn(
          "flex h-6 w-full items-center justify-start px-2",
          currentSpan.isRoot &&
            "my-1 rounded-sm border border-dashed border-border-strong",
        )}
      >
        {currentSpan.isRoot ? (
          <div className={cn("rounded-sm px-2 leading-5", pillColors)}>
            <span className="font-mono text-xs">In-Progress</span>
          </div>
        ) : (
          <div>
            <span className="font-mono text-xs text-foreground">
              In-Progress
            </span>
            <span className="mx-2 text-subtle-foreground">...</span>
            <span className="font-mono text-xs text-muted-foreground">
              Started: {formatDuration(relativeStartTime)} after trace start
            </span>
          </div>
        )}
      </div>
    )
  }

  const rootNanos = Option.match(root.duration, {
    onNone: () => {
      const now = processOrPerformanceNow()
      return Number(now - traceStartTime)
    },
    onSome: (duration) => Number(Duration.toNanosUnsafe(duration)),
  })
  const spanStartTime = Option.getOrThrow(currentSpan.startTime)
  const spanDuration = Option.getOrThrow(currentSpan.duration)
  const spanNanos = Number(Duration.toNanosUnsafe(spanDuration))

  const scaleFactor = column.getSize() / rootNanos
  const spacer = Number(spanStartTime - traceStartTime) * scaleFactor
  const width = `${(spanNanos / rootNanos) * 100}%`

  return (
    <div className="flex w-full items-center justify-start">
      <div role="separator" style={{ width: spacer }} />
      <div className="flex h-full w-full flex-col justify-center">
        <button
          type="button"
          aria-label="select table row"
          style={{ width }}
          className={cn(
            "my-1 flex h-6 min-w-1 cursor-pointer items-center rounded-sm border bg-transparent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            currentSpan.hasError
              ? "border-destructive/60 bg-destructive/20 hover:bg-destructive/30"
              : "border-brand/50 bg-brand/15 hover:bg-brand/25",
          )}
          onClick={row.getToggleSelectedHandler()}
        >
          <span
            className={cn(
              "ml-2 font-mono text-xs whitespace-nowrap",
              pillColors,
            )}
          >
            {formatDuration(spanDuration)}
          </span>
        </button>
        {row.getIsSelected() && <TraceDetails span={currentSpan} />}
      </div>
    </div>
  )
}

const performanceNowNanos = (function () {
  const bigint1e6 = BigInt(1_000_000)
  if (typeof performance === "undefined") {
    return () => BigInt(Date.now()) * bigint1e6
  }
  const origin =
    BigInt(Date.now()) * bigint1e6 -
    BigInt(Math.round(performance.now() * 1_000_000))
  return () => origin + BigInt(Math.round(performance.now() * 1_000_000))
})()
const processOrPerformanceNow = (function () {
  const processHrtime =
    typeof process === "object" &&
    "hrtime" in process &&
    typeof process.hrtime.bigint === "function"
      ? process.hrtime
      : undefined
  if (!processHrtime) {
    return performanceNowNanos
  }
  const origin = performanceNowNanos() - processHrtime.bigint()
  return () => origin + processHrtime.bigint()
})()

function getPillColors(span: Span) {
  if (span.hasError) {
    return "text-destructive"
  }
  return "text-foreground"
}
