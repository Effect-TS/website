import { Tabs as T, Tab } from "nextra-theme-docs"
import type { ReactNode } from "react"

export function Tabs({ children }: { children: ReactNode }) {
  return <T items={["Using pipe", "Using Effect.gen"]}>{children}</T>
}

export { Tab }
