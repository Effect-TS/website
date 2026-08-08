import { useAtomValue } from "@effect/atom-react"
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
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

const columns: Array<ColumnDef<Span>> = [
  {
    id: "name",
    accessorFn: (node) => node,
    header: () => (
      <h5 role="columnheader" className="ml-2 text-sm font-bold">
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
      <h5 role="columnheader" className="ml-2 grow text-sm font-bold">
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

  const table = useReactTable<Span>({
    data,
    columns,
    state: {
      columnVisibility: {
        attributes: false,
        duration: false,
        events: false,
      },
      expanded,
      rowSelection,
    },
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableSubRowSelection: false,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (span) => span.children as Array<Span>,
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
  }, [table.getState().columnSizingInfo, table.getState().columnSizing])

  return (
    <div className="h-full w-full overflow-auto">
      <table
        style={columnSizeVars as any}
        className="w-full border-collapse border-spacing-0 border-b border-zinc-300 dark:border-zinc-700"
      >
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="flex border-x border-zinc-300 transition-none hover:bg-transparent dark:border-zinc-700"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    width: `calc(var(--header-${header?.id}-size) * 1px)`,
                  }}
                  className={cn(
                    "grid grid-cols-[minmax(150px,1fr)_8px] items-center border-t border-zinc-300 p-0 text-left font-normal dark:border-zinc-700",
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
                      className="h-full w-px cursor-ew-resize border-l border-zinc-300 px-0.75 dark:border-zinc-700"
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
                    "flex border-x border-zinc-300 hover:bg-zinc-100 data-[state=selected]:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:data-[state=selected]:bg-zinc-800",
                    span.hasError &&
                      "bg-red-500/30 hover:bg-red-500/40 data-[state=selected]:bg-red-500/30",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
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
                          className="h-full w-px border-l border-zinc-300 px-0.75 dark:border-zinc-700"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-24 w-auto text-center">
                No results.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function NameCell({ getValue, row }: CellContext<Span, unknown>) {
  const node = getValue<Span>()
  return (
    <div className="ml-2 flex h-full items-start overflow-hidden text-ellipsis whitespace-nowrap">
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
        <span className="overflow-hidden text-ellipsis">{node.label}</span>
      </div>
    </div>
  )
}

function DurationCell({ getValue, row, column }: CellContext<Span, unknown>) {
  const currentSpan = getValue<Span>()
  const root = currentSpan.isRoot
    ? currentSpan
    : row.getParentRows()[0]?.original

  if (root === undefined) {
    return null
  }

  if (currentSpan.span._tag === "ExternalSpan") {
    return (
      <div className="text-xs text-zinc-500">
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
            "my-1 rounded-sm outline-2 outline-black/40 outline-dashed dark:outline-zinc-500",
        )}
      >
        {currentSpan.isRoot ? (
          <div
            className={cn(
              "rounded-sm bg-white/90 px-2 leading-3 text-black",
              pillColors,
            )}
          >
            <span className="text-xs">In-Progress</span>
          </div>
        ) : (
          <div>
            <span className="text-xs">In-Progress</span>
            <span className="mx-2">...</span>
            <span className="text-xs font-medium text-zinc-500">
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
          className="my-1 flex h-6 cursor-pointer rounded-sm border border-zinc-900 bg-transparent dark:border-white"
          onClick={row.getToggleSelectedHandler()}
        >
          <div className={cn("my-0.5 ml-2 rounded-sm leading-3", pillColors)}>
            <span className="px-1 text-xs">{formatDuration(spanDuration)}</span>
          </div>
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
    return "bg-red-600 text-white font-bold"
  }
  return "bg-zinc-900 text-white dark:bg-white dark:text-black font-bold"
}
