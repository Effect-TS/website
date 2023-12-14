"use client"

import { usePathname } from "next/navigation"
import { FC, ReactNode, useEffect } from "react"

export const ThemeWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div id="theme-wrapper">
      <div className="bg-white dark:bg-[#09090B] text-zinc-700 dark:text-zinc-400">{children}</div>
    </div>
  )
}
