"use client"

import * as ResizablePrimitive from "react-resizable-panels"

export function PanelResizeHandleHorizontal(
  props: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle>
) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      {...props}
      className={`h-px bg-neutral-200 dark:bg-neutral-700`}
    />
  )
}

export function PanelResizeHandleVertical(
  props: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle>
) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      {...props}
      className={`w-px bg-neutral-200 dark:bg-neutral-700`}
    />
  )
}
