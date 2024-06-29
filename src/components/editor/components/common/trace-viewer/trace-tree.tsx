import React, { useEffect, useMemo, useRef, useState } from "react"
import { Row } from "@tanstack/react-table"
import { SpanNode } from "@/workspaces/services/TraceProvider"

export function TraceTree({ row }: { readonly row: Row<SpanNode> }) {
  const ref = useRef<SVGSVGElement>(null)
  const [height, setHeight] = useState(32)

  // Update the height of this level of the tree whenever the row changes height
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
      {/* Only draw a horizontal connector if not at the root of the tree */}
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
      {/* Only draw vertical connectors if not at the root of the tree */}
      {row.depth > 0 && (
        <VerticalBranchConnectors height={height} row={row} />
      )}
    </svg>
  )
}

function BranchNode({
  branches,
  depth,
  height,
  isExpanded
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
        className="fill-white dark:fill-black stroke-1 stroke-muted-foreground cursor-pointer"
      />
      {isExpanded && (
        <line
          x1={12 + depth * 16}
          y1="24"
          x2={12 + depth * 16}
          y2={height}
          className="stroke-1 stroke-muted-foreground"
        />
      )}
      <text
        x={12 + depth * 16}
        y="20"
        textAnchor="middle"
        className="text-[10px] font-medium fill-black dark:fill-white"
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
        className="fill-transparent	stroke-1 stroke-muted-foreground cursor-pointer"
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
      className="stroke-1 stroke-muted-foreground"
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
      className="stroke-1 stroke-muted-foreground"
    />
  )
}

function VerticalBranchConnectors({
  height,
  row
}: {
  readonly height: number
  readonly row: Row<SpanNode>
}) {
  const depthsWithChildren = useMemo(() => getDepthsWithChildren(row), [row])
  return Array.from({ length: row.depth }, (_, index) => {
    // The depth is always one more than the index
    const depth = index + 1
    // Determine if the depth points at the current row
    const isCurrentRow = depth === row.depth
    // Determine if this row is a leaf row
    const parentRow = row.getParentRow()!
    const isLeaf = row.index === parentRow.subRows.length - 1
    // Determine whether or not the ancestor node in the tree has children that
    // extend beyond this node in the tree
    const hasAncestorWithChildren = depthsWithChildren.includes(depth)
    // If the depth is equivalent to this row's depth or there is an ancestor
    // with children at this depth, draw a vertical connector
    if (isCurrentRow || hasAncestorWithChildren) {
      const x = 12 + index * 16
      // If the current row contains a leaf node and this depth doesn't have
      // any ancestors with children, then we need to render a very small
      // vertical connector to create a corner and connect to the next node in
      // the tree. If the current row does not contain a leaf node and this
      // depth does have ancestors with children, render a full-length vertical
      // connector, otherwise render a half-length vertical connector.
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
          className="stroke-1 stroke-muted-foreground"
        />
      )
    }
    return null
  })
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
