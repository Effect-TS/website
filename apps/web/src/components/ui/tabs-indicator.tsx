import type { CSSProperties } from "react"
import type { TabsIndicatorRect } from "@/hooks/useTabsIndicator"
import { cn } from "@/lib/utils"

interface TabsIndicatorProps {
  readonly rect: TabsIndicatorRect | undefined
  readonly variant: "line" | "fill"
  readonly className?: string | undefined
}

export function TabsIndicator({
  rect,
  variant,
  className,
}: TabsIndicatorProps) {
  if (rect === undefined) {
    return null
  }

  const style: CSSProperties =
    variant === "line"
      ? {
          left: `${rect.left}px`,
          width: `${rect.width}px`,
        }
      : {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        }

  return (
    <div
      style={style}
      className={cn(
        "pointer-events-none absolute z-0 motion-reduce:transition-none",
        variant === "line"
          ? "bottom-0 h-px transition-[left,width] duration-200 ease-out"
          : "transition-[left,top,width,height] duration-200 ease-out",
        className,
      )}
      aria-hidden="true"
    />
  )
}
