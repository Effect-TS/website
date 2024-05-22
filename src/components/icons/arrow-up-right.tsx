import React from "react"
import type { Icon } from "@/components/icons"
import { cn } from "@/lib/utils"

export const ArrowUpRightIcon: React.FC<Icon.CommonProps> = ({
  className
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 384 512"
      className={cn("fill-current", className)}
    >
      <path d="M328 96h24v24V360v24H304V360 177.9L81 401l-17 17L30.1 384l17-17 223-223H88 64V96H88 328z" />
    </svg>
  )
}

ArrowUpRightIcon.displayName = "ArrowUpRightIcon"
