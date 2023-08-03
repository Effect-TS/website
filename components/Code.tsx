import { Tabs as CustomTabs, Tab } from "nextra-theme-docs"
import type { ReactNode } from "react"

export function Tabs({
  defaultIndex,
  children
}: {
  defaultIndex?: number
  children: ReactNode
}) {
  return (
    <CustomTabs
      defaultIndex={defaultIndex}
      items={["Using Effect.gen", "Using pipe"]}
    >
      {children}
    </CustomTabs>
  )
}

export { Tab, CustomTabs }
