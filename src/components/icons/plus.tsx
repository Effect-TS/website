import React from "react"
import type { Icon } from "@/components/icons"
import { cn } from "@/lib/utils"

export function PlusIcon({ className }: Icon.CommonProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("stroke-current", className)}
    >
      <path d="M9 2V16" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M2 9H16" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  )
}
