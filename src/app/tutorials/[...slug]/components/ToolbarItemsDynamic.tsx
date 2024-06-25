"use client"

import dynamic from "next/dynamic"

export const ToolbarItemsDynamic = dynamic(
  async () => {
    return (await import("./ToolbarItems")).ToolbarItems
  },
  { ssr: false }
)
