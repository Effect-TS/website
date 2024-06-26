import React, { useMemo, useRef } from "react"
import { Array, Duration, Option, pipe } from "effect"
import { useRxSuspenseSuccess, useRxValue } from "@effect-rx/rx-react"
import {
  CellContext,
  ColumnDef,
  ExpandedState,
  Row,
  RowData,
  Table as ReactTable,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { devToolsRx } from "@/workspaces/rx/devtools"
import { SpanNode } from "@/workspaces/services/TraceProvider"
import { formatDuration } from "./utils"

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    grow: boolean
  }

}

const columns: Array<ColumnDef<SpanNode>> = [
  {
    id: "name",
    accessorFn: (node) => node.label,
    header: () => <span>Name</span>,
    cell: ({ row, getValue }) => {
      return (
        <div className="flex items-center overflow-hidden text-ellipsis whitespace-nowrap">
          <button onClick={row.getToggleExpandedHandler()}>
            <SpanIndicator row={row} />
          </button>
          <span className="ml-1.5 overflow-hidden text-ellipsis">
            {getValue<string>()}
          </span>
        </div>
      )
    },
    minSize: 200
  },
  {
    id: "duration",
    accessorFn: (node) => node,
    header: () => <div className="grow">Duration</div>,
    cell: (props) => <DurationBlock {...props} />,
    meta: {
      grow: true
    },
    enableResizing: false
  }
]

export function TraceWaterfall() {
  const devTools = useRxSuspenseSuccess(devToolsRx).value
  const traces = useRxValue(devTools.traces)
  const selected = useRxValue(devTools.selectedTrace)
  const data = useMemo(
    () => Array.fromNullable(traces[selected]),
    [traces, selected]
  )
  const headerRef = useRef<HTMLTableSectionElement>(null)
  const [expanded, setExpanded] = React.useState<ExpandedState>(true)

  const table = useReactTable<SpanNode>({
    data,
    columns,
    state: { expanded },
    columnResizeMode: "onChange",
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (node) => devTools.getSpanChildren(node)
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
    <div className="h-full w-full">
      <Table style={columnSizeVars}>
        <TableHeader ref={headerRef}>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="flex">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    data-id={header.id}
                    style={{
                      width: `calc(var(--header-${header?.id}-size) * 1px)`
                    }}
                    className={cn(
                      "relative flex items-center border-x border-t",
                      header.column.columnDef.meta?.grow && "grow"
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getCanResize() && (
                      <div
                        onDoubleClick={() => header.column.resetSize()}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="absolute top-0 right-0 h-full w-[5px] bg-white/50 cursor-col-resize opacity-0 hover:opacity-100"
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

function UnmemoizedTableBody({
  table
}: {
  readonly table: ReactTable<SpanNode>
}) {
  return (
    <TableBody>
      {table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            data-state={row.getIsSelected() && "selected"}
            className="flex"
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                style={{
                  width: `calc(var(--col-${cell.column.id}-size) * 1px)`
                }}
                className={cn(
                  "h-8 py-0 flex items-center border-x",
                  cell.column.columnDef.meta?.grow && "grow"
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell
            colSpan={columns.length}
            className="h-24 w-auto text-center"
          >
            No results.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  )
}

function DurationBlock({
  getValue,
  row,
  column,
}: CellContext<SpanNode, unknown>) {
  const currentSpan = getValue<SpanNode>()
  const root = currentSpan.isRoot
    ? currentSpan
    : row.getParentRows()[0]?.original

  if (root === undefined) {
    return null
  }

  const rootDuration = Option.getOrThrow(root.duration)
  const rootNanos = Number(Duration.unsafeToNanos(rootDuration))
  const scaleFactor = column.getSize() / rootNanos

  const rootStartDuration = Option.getOrThrow(root.startTime)
  const rootStartNanos = Number(Duration.unsafeToNanos(rootStartDuration))
  const currentStartDuration = Option.getOrThrow(currentSpan.startTime)
  const currentStartNanos = Number(Duration.unsafeToNanos(currentStartDuration))
  const currentDuration = Option.getOrThrow(currentSpan.duration)
  const currentNanos = Number(Duration.unsafeToNanos(currentDuration))

  const left = (currentStartNanos - rootStartNanos) * scaleFactor
  const width = `${(currentNanos / rootNanos) * 100}%`

  return (
    <div className="relative h-full w-full">
      <div>
        <div
          style={{ left, width }}
          className="absolute top-1 h-6 border border-white rounded-sm"
        />
        <div
          style={{ left: left + 12 }}
          className="absolute z-10 top-[9px] h-[14px] px-1 bg-white/90 rounded-sm"
        >
          <span className="block font-display text-black text-xs">
            {formatDuration(currentDuration)}
          </span>
        </div>
      </div>
    </div>
  )
}

function SpanIndicator({ row }: { readonly row: Row<SpanNode> }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={30 + row.depth * 16}
      height="30"
      preserveAspectRatio="xMidYMid meet"
      className="shrink-0"
    >
      <HorizontalLine depth={row.depth} />
      {row.subRows.length === 0 ? (
        <LeafNodeIndicator row={row} />
      ) : (
        <SpanNodeIndicator row={row} />
      )}
      {row.depth > 0 && <VerticalLine row={row} />}
    </svg>
  )
}

function HorizontalLine({ depth }: { readonly depth: number }) {
  if (depth === 0) {
    return null
  }
  const classes = "stroke-1 stroke-muted-foreground"
  const x1 = 13 + (depth - 1) * 16
  const x2 = 28 + (depth - 1) * 16
  return <line x1={x1} x2={x2} y1="16" y2="16" className={classes} />
}

function VerticalLine({ row }: { readonly row: Row<SpanNode> }) {
  const depthsWithChildren = useMemo(() => getDepthsWithChildren(row), [row])
  const classes = "stroke-1 stroke-muted-foreground"
  const parentRow = row.getParentRow()!
  const isLastChild = row.index === parentRow.subRows.length - 1
  const lines = pipe(
    Array.range(1, row.depth),
    Array.filterMap((depth) => {
      const hasAncestorWithChildren = depthsWithChildren.includes(depth)
      if (depth === row.depth || hasAncestorWithChildren) {
        const x = 12 + (depth - 1) * 16
        const y = isLastChild && !hasAncestorWithChildren ? 16.5 : 32
        return Option.some(
          <line key={depth} x1={x} x2={x} y1={0} y2={y} className={classes} />
        )
      }
      return Option.none()
    })
  )
  return lines
}

function SpanNodeIndicator({ row }: { readonly row: Row<SpanNode> }) {
  return (
    <>
      <rect
        height="16"
        width="20"
        x={2 + row.depth * 16}
        y="8"
        rx="3px"
        ry="3px"
        className="fill-white dark:fill-black stroke-1 stroke-muted-foreground cursor-pointer"
      />
      {row.getIsExpanded() && (
        <line
          x1={12 + row.depth * 16}
          y1="24"
          x2={12 + row.depth * 16}
          y2="32"
          className="stroke-1 stroke-muted-foreground"
        />
      )}
      <text
        x={12 + row.depth * 16}
        y="20"
        textAnchor="middle"
        className="text-[10px] font-medium fill-black dark:fill-white"
      >
        {row.subRows.length}
      </text>
      <rect
        height="16"
        width="20"
        x={2 + row.depth * 16}
        y="8"
        rx="3px"
        ry="3px"
        className="fill-transparent	stroke-1 stroke-muted-foreground cursor-pointer"
      />
    </>
  )
}

function LeafNodeIndicator({ row }: { readonly row: Row<SpanNode> }) {
  const cx = 28 + (row.depth - 1) * 16
  const classes = "stroke-1 stroke-muted-foreground"
  return <circle cx={cx} cy="16" r="3" className={classes} />
}

/**
 * Traverses up the tree of rows and determines which ancestor rows have
 * children that will be rendered after the current row.
 */
function getDepthsWithChildren(
  row: Row<SpanNode>,
  depths: Array<number> = []
): ReadonlyArray<number> {
  const parentRow = row.getParentRow()
  if (!parentRow) {
    return depths
  }
  if (parentRow.subRows.length - 1 > row.index) {
    depths.push(row.depth)
  }
  return getDepthsWithChildren(parentRow, depths)
}
