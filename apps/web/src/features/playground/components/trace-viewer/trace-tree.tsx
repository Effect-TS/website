import type { Row } from "@tanstack/react-table"
import { useEffect, useMemo, useRef, useState } from "react"
import { Span } from "../../domain/devtools"
import type { features } from "./trace-waterfall"

type SpanRow = Row<typeof features, Span>

export function TraceTree({ row }: { readonly row: SpanRow }) {
  const ref = useRef<SVGSVGElement>(null)
  const [height, setHeight] = useState(32)

  useEffect(() => {
    const svg = ref.current!
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]!
      const observedHeight = entry.contentRect.height
      if (observedHeight > 0 && observedHeight !== height) {
        setHeight(observedHeight)
      }
    })
    observer.observe(svg)
    return () => observer.unobserve(svg)
  }, [height])

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      height="32"
      width={32 + row.depth * 16}
      preserveAspectRatio="xMidYMid meet"
      className="h-full shrink-0"
    >
      {row.depth > 0 && <HorizontalBranchConnector depth={row.depth} />}
      {row.subRows.length === 0 ? (
        <LeafNode depth={row.depth} />
      ) : (
        <BranchNode
          branches={row.subRows.length}
          depth={row.depth}
          height={height}
          isExpanded={row.getIsExpanded()}
        />
      )}
      {row.depth > 0 && <VerticalBranchConnectors height={height} row={row} />}
    </svg>
  )
}

function BranchNode({
  branches,
  depth,
  height,
  isExpanded,
}: {
  readonly branches: number
  readonly depth: number
  readonly height: number
  readonly isExpanded: boolean
}) {
  return (
    <>
      <rect
        height="16"
        width="20"
        x={2 + depth * 16}
        y="8"
        rx="3px"
        ry="3px"
        className="cursor-pointer fill-card stroke-border-strong stroke-1"
      />
      {isExpanded && (
        <line
          x1={12 + depth * 16}
          y1="24"
          x2={12 + depth * 16}
          y2={height}
          className="stroke-border-strong stroke-1"
        />
      )}
      <text
        x={12 + depth * 16}
        y="20"
        textAnchor="middle"
        className="fill-foreground font-mono text-[10px] font-medium"
      >
        {branches}
      </text>
      <rect
        height="16"
        width="20"
        x={2 + depth * 16}
        y="8"
        rx="3px"
        ry="3px"
        className="cursor-pointer fill-transparent stroke-border-strong stroke-1"
      />
    </>
  )
}

function LeafNode({ depth }: { readonly depth: number }) {
  const cx = 28 + (depth - 1) * 16
  return (
    <circle
      cx={cx}
      cy="16"
      r="3"
      className="fill-card stroke-border-strong stroke-1"
    />
  )
}

function HorizontalBranchConnector({ depth }: { readonly depth: number }) {
  const x1 = 13 + (depth - 1) * 16
  const x2 = 28 + (depth - 1) * 16
  return (
    <line
      x1={x1}
      x2={x2}
      y1="16"
      y2="16"
      className="stroke-border-strong stroke-1"
    />
  )
}

function VerticalBranchConnectors({
  height,
  row,
}: {
  readonly height: number
  readonly row: SpanRow
}) {
  const depthsWithChildren = useMemo(() => getDepthsWithChildren(row), [row])
  return Array.from({ length: row.depth }, (_, index) => {
    const depth = index + 1
    const isCurrentRow = depth === row.depth
    const parentRow = row.getParentRow()!
    const isLeaf = row.index === parentRow.subRows.length - 1
    const hasAncestorWithChildren = depthsWithChildren.includes(depth)
    if (isCurrentRow || hasAncestorWithChildren) {
      const x = 12 + index * 16
      let y =
        isLeaf && !hasAncestorWithChildren
          ? 16.5
          : hasAncestorWithChildren
            ? height
            : height / 2
      return (
        <line
          key={depth}
          x1={x}
          x2={x}
          y1={0}
          y2={y}
          className="stroke-border-strong stroke-1"
        />
      )
    }
    return null
  })
}

function getDepthsWithChildren(
  row: SpanRow,
  depths: Array<number> = [],
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
