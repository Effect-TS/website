import { Tabs } from "@foldkit/ui"
import type { ExampleCategory } from "../catalog/index"

/** Tabs know their value type, so a selection arrives as a category. */
export const CategoryTabs = Tabs.create<ExampleCategory>()

export const ExampleTabs = Tabs.create<string>()

export const ControlTabs = Tabs.create<string>()
