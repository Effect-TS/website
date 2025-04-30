import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/css/utils"

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  direction: "horizontal" | "vertical"
  withHandle?: boolean
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn("bg-neutral-200 dark:bg-neutral-700", props.direction === "horizontal" ? "h-px" : "w-px", className)}
    {...props}
  />
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
