import React from "react"
import type { Icon } from "@/components/icons"
import { cn } from "@/lib/utils"

export const NextIcon: React.FC<Icon.CommonProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 17 16"
      className={cn("fill-current", className)}
    >
      <path d="M13.0303 14.6529C11.7591 15.5038 10.2305 16 8.58594 16C4.16766 16 0.585938 12.4183 0.585938 8C0.585938 3.58172 4.16766 0 8.58594 0C13.0042 0 16.5859 3.58172 16.5859 8C16.5859 10.3903 15.5376 12.5358 13.8756 14.0018L11.8984 11.455V4.8125H10.8359V10.0864L6.73194 4.8H5.38599V11.1973H6.46275V6.16743L13.0303 14.6529Z" />
    </svg>
  )
}

NextIcon.displayName = "NextIcon"
