import React from "react"
import type { Icon } from "@/components/icons"
import { cn } from "@/lib/utils"

export declare namespace DirectoryClosedIcon {
  export interface Props {}
}

export const DirectoryClosedIcon: React.FC<Icon.CommonProps> = ({
  className
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 16 16"
      height="16"
      width="16"
      className={cn("fill-current", className)}
    >
      <title>Directory</title>
      <path
        d="M12.3334 12.6667H3.66675C3.11446 12.6667 2.66675 12.219 2.66675 11.6667V5C2.66675 4.44772 3.11446 4 3.66675 4H5.69731C5.89473 4 6.08774 4.05844 6.25201 4.16795L7.74816 5.16538C7.91242 5.2749 8.10543 5.33333 8.30286 5.33333H12.3334C12.8857 5.33333 13.3334 5.78105 13.3334 6.33333V11.6667C13.3334 12.219 12.8857 12.6667 12.3334 12.6667Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  )
}

DirectoryClosedIcon.displayName = "DirectoryClosedIcon"
