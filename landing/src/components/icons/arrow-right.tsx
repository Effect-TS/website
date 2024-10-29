import React from "react"
import type { Icon } from "@/components/icons"
import { cn } from "@/lib/utils"

export const ArrowRightIcon: React.FC<Icon.CommonProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 448 512"
      className={cn("fill-current", className)}
    >
      <path d="M429.8 273l17-17-17-17L276.2 85.4l-17-17-33.9 33.9 17 17L354.9 232 24 232 0 232l0 48 24 0 330.8 0L242.2 392.6l-17 17 33.9 33.9 17-17L429.8 273z" />
    </svg>
  )
}

ArrowRightIcon.displayName = "ArrowRightIcon"
