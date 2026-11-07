import { RadioGroup, Tabs } from "@foldkit/ui"
import type { ExampleCategory } from "../catalog/index"

/** Tabs know their value type, so a selection arrives as a category. */
export const CategoryTabs = Tabs.create<ExampleCategory>()

export const ExampleTabs = Tabs.create<string>()

/** A control picks one option, so it is a radio group and has no panel. */
export const ControlGroup = RadioGroup.create<string>()
