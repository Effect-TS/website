import React from "react"
import type { Icon } from "@/components/icons"
import { cn } from "@/lib/utils"

export const ArrowsUpDownIcon: React.FC<Icon.CommonProps> = ({
  className
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("fill-current", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
      />
    </svg>
  )
}

ArrowsUpDownIcon.displayName = "ArrowsUpDownIcon"
