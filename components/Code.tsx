import { Tabs as T, Tab } from "nextra-theme-docs"
import type { ReactNode } from "react"

export function Tabs({
  defaultIndex,
  children,
}: {
  defaultIndex?: number
  children: ReactNode
}) {
  return (
    <T defaultIndex={defaultIndex} items={["Using pipe", "Using Effect.gen"]}>
      {children}
    </T>
  )
}

export { Tab }
