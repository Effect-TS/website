"use client"

import dynamic from "next/dynamic"

export const PlaygroundDynamic = dynamic(
  async () => {
    return (await import("./playground")).Playground
  },
  { ssr: false }
)
