import React, { useMemo } from "react"
import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type CellContext,
  type ColumnDef,
  type ExpandedState,
  type RowData,
  type Table as ReactTable,
  type RowSelectionState
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/css/utils"
import { Span } from "../../domain/devtools"
import { TraceDetails } from "./trace-details"
import { TraceTree } from "./trace-tree"
import { formatDuration } from "./utils"
import { useRxValue } from "@effect-rx/rx-react"
import { selectedSpanRx } from "../../rx/devtools"

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    grow: boolean
  }
}

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
    minSize: 200
  },
  {
    id: "span",
    accessorFn: (node) => node,
    header: () => (
      <h5 role="columnheader" className="grow ml-2 text-sm font-bold">
        Duration
      </h5>
    ),
    cell: (props) => <DurationCell {...props} />,
    meta: {
      grow: true
    },
    enableResizing: false
  }
]

export function TraceWaterfall() {
  const selectedSpan = useRxValue(selectedSpanRx)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [expanded, setExpanded] = React.useState<ExpandedState>(true)
  const data = useMemo(() => (selectedSpan === undefined ? [] : [selectedSpan]), [selectedSpan])

  const table = useReactTable<Span>({
    data,
    columns,
    state: {
      columnVisibility: {
        attributes: false,
        duration: false,
        events: false
      },
      expanded,
      rowSelection
    },
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableSubRowSelection: false,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (span) => span.children as Array<Span>
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [table.getState().columnSizingInfo, table.getState().columnSizing])

  return (
    <div className="h-full w-full not-content">
      <Table style={columnSizeVars} className="border-spacing-0">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="flex border-x border-gray-400 dark:border-gray-700 hover:bg-transparent transition-none"
            >
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    style={{
                      width: `calc(var(--header-${header?.id}-size) * 1px)`
                    }}
                    className={cn(
                      "grid grid-cols-[minmax(150px,1fr)_8px] items-center p-0 border-t border-gray-400 dark:border-gray-700",
                      header.column.columnDef.meta?.grow && "grow"
                    )}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanResize() && (
                      <div
                        role="separator"
                        aria-label="drag to resize"
                        onDoubleClick={() => header.column.resetSize()}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="h-full w-px border-l border-gray-400 dark:border-gray-700 px-[3px] cursor-ew-resize"
                      />
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        {/* When resizing any column we will render this special memoized version of our table body */}
        {table.getState().columnSizingInfo.isResizingColumn ? (
          <MemoizedTableBody table={table} />
        ) : (
          <UnmemoizedTableBody table={table} />
        )}
      </Table>
    </div>
  )
}

const MemoizedTableBody = React.memo(
  UnmemoizedTableBody,
  (prev, next) => prev.table.options.data === next.table.options.data
) as typeof UnmemoizedTableBody

function UnmemoizedTableBody({ table }: { readonly table: ReactTable<Span> }) {
  return (
    <TableBody className="[&_tr:last-child]:border-1">
      {table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row) => {
          const span = row.getValue<Span>("span")
          return (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
              className={cn(
                "flex border-x border-gray-400 dark:border-gray-700 data-[state=selected]:bg-[--sl-color-gray-6] dark:data-[state=selected]:bg-[--sl-color-gray-5] hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5]",
                span.hasError && "bg-destructive/30 hover:bg-destructive/40 data-[state=selected]:bg-destructive/30"
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={{
                    width: `calc(var(--col-${cell.column.id}-size) * 1px)`
                  }}
                  className={cn(
                    "min-h-8 grid grid-cols-[minmax(150px,1fr)_8px] items-center p-0",
                    cell.column.columnDef.meta?.grow && "grow"
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  {cell.column.getCanResize() && (
                    <div
                      role="separator"
                      className="h-full w-px border-l border-gray-400 dark:border-gray-700 px-[3px]"
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          )
        })
      ) : (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 w-auto text-center">
            No results.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  )
}

function NameCell({ getValue, row }: CellContext<Span, unknown>) {
  const node = getValue<Span>()
  return (
    <div className="h-full flex items-start ml-2 overflow-hidden text-ellipsis whitespace-nowrap">
      <button
        type="button"
        className="h-full flex items-start p-0 bg-transparent"
        onClick={row.getToggleExpandedHandler()}
      >
        <TraceTree row={row} />
      </button>
      <div className={cn("h-8 flex items-center", row.subRows.length > 0 && "ml-1.5")}>
        <span className="overflow-hidden text-ellipsis">{node.label}</span>
      </div>
    </div>
  )
}

function DurationCell({ getValue, row, column }: CellContext<Span, unknown>) {
  const currentSpan = getValue<Span>()
  const root = currentSpan.isRoot ? currentSpan : row.getParentRows()[0]?.original

  if (root === undefined) {
    return null
  }

  // Filter out external spans since they do not contain useful information
  if (currentSpan.span._tag === "ExternalSpan") {
    return <div className="font-display text-xs text-[--sl-color-text]">&lt;&lt; External Span &gt;&gt;</div>
  }

  // After filtering out external spans, there are three states the current span
  // can be in:
  //   1. The current span is still in progress
  //   2. The current span has ended but the root span has not
  //   3. Both current span and the root span have ended

  // Only external spans will not have a start time, it is safe to `.getOrThrow`
  const traceStartTime = Option.getOrThrow(root.startTime)

  const pillColors = getPillColors(currentSpan)

  // Case #1: Current span is still in progress
  if (Option.isSome(currentSpan.startTime) && Option.isNone(currentSpan.endTime)) {
    const spanStartTime = currentSpan.startTime.value
    const relativeStartTime = Duration.nanos(spanStartTime - traceStartTime)
    return (
      <div
        className={cn(
          "w-full h-6 flex items-center px-2 justify-start",
          currentSpan.isRoot &&
            "my-1 outline-dashed outline-2 outline-black/40 dark:outline-muted-foreground rounded-sm"
        )}
      >
        {currentSpan.isRoot ? (
          <div className={cn("px-2 bg-white/90 text-black rounded-sm leading-3", pillColors)}>
            <span className="font-display text-xs">In-Progress</span>
          </div>
        ) : (
          <div>
            <span className="font-display text-xs">In-Progress</span>
            <span className="mx-2">...</span>
            <span className="text-xs font-medium text-[--sl-color-text]">
              Started: {formatDuration(relativeStartTime)} after trace start
            </span>
          </div>
        )}
      </div>
    )
  }

  const rootNanos = Option.match(root.duration, {
    // Case #2: Current span has ended but root span is in progress
    onNone: () => {
      const now = processOrPerformanceNow()
      return Number(now - traceStartTime)
    },
    // Case #3: Current span and root span have both ended
    onSome: (duration) => Number(Duration.unsafeToNanos(duration))
  })
  const spanStartTime = Option.getOrThrow(currentSpan.startTime)
  const spanDuration = Option.getOrThrow(currentSpan.duration)
  const spanNanos = Number(Duration.unsafeToNanos(spanDuration))

  const scaleFactor = column.getSize() / rootNanos
  const spacer = Number(spanStartTime - traceStartTime) * scaleFactor
  const width = `${(spanNanos / rootNanos) * 100}%`

  return (
    <div className="w-full flex items-center justify-start">
      <div role="separator" style={{ width: spacer }} />
      <div className="h-full w-full flex flex-col justify-center">
        <button
          type="button"
          aria-label="select table row"
          style={{ width }}
          className="h-6 my-1 flex bg-transparent border border-[--sl-color-white] rounded-sm cursor-pointer"
          onClick={row.getToggleSelectedHandler()}
        >
          <div className={cn("mt-0.5 ml-2 rounded-sm leading-3", pillColors)}>
            <span className="px-1 font-display text-xs">{formatDuration(spanDuration)}</span>
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
  const origin = BigInt(Date.now()) * bigint1e6 - BigInt(Math.round(performance.now() * 1_000_000))
  return () => origin + BigInt(Math.round(performance.now() * 1_000_000))
})()
const processOrPerformanceNow = (function () {
  const processHrtime =
    typeof process === "object" && "hrtime" in process && typeof process.hrtime.bigint === "function"
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
    return "bg-destructive text-[--sl-color-black] dark:text-[--sl-color-white] font-bold"
  }
  return "bg-[--sl-color-white] text-[--sl-color-black] font-bold"
}
