import { motion } from "motion/react"
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

  if (variant === "fill") {
    return (
      <motion.div
        initial={false}
        animate={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }}
        transition={{
          type: "spring",
          visualDuration: 0.3,
          bounce: 0,
        }}
        className={cn(
          "pointer-events-none absolute z-0 motion-reduce:transition-none",
          className,
        )}
        aria-hidden="true"
      />
    )
  }

  const style: CSSProperties = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }

  return (
    <div
      style={style}
      className={cn(
        "pointer-events-none absolute bottom-0 z-0 h-px transition-[left,width] duration-200 ease-out motion-reduce:transition-none",
        className,
      )}
      aria-hidden="true"
    />
  )
}
