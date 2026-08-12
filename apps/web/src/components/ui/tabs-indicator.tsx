import { motion } from "motion/react"
import type { TabsIndicatorRect } from "@/hooks/useTabsIndicator"
import { cn } from "@/lib/utils"

interface TabsIndicatorProps {
  readonly rect: TabsIndicatorRect | undefined
  readonly className?: string | undefined
}

export function TabsIndicator({ rect, className }: TabsIndicatorProps) {
  if (rect === undefined) {
    return null
  }

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
      className={cn("pointer-events-none absolute z-0", className)}
      aria-hidden="true"
    />
  )
}
