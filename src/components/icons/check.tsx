import React from "react"
import type { Icon } from "@/components/icons"
import { cn } from "@/lib/utils"

export const CheckIcon: React.FC<Icon.CommonProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25 24"
      className={cn("fill-current", className)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.0821 5.29289C21.4726 5.68342 21.4726 6.31658 21.0821 6.70711L10.0821 17.7071C9.69158 18.0976 9.05842 18.0976 8.66789 17.7071L3.66789 12.7071C3.27737 12.3166 3.27737 11.6834 3.66789 11.2929C4.05842 10.9024 4.69158 10.9024 5.08211 11.2929L9.375 15.5858L19.6679 5.29289C20.0584 4.90237 20.6916 4.90237 21.0821 5.29289Z"
      />
    </svg>
  )
}

CheckIcon.displayName = "CheckIcon"
