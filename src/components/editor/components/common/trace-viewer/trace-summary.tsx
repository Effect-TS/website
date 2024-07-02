import React, { useMemo } from "react"
import { Duration, Option } from "effect"
import { Icon } from "@/components/icons"
import { useDevTools, useSelectedSpan } from "@/workspaces/context/devtools"
import { formatDuration, getTotalSpans } from "./utils"

export function TraceSummary() {
  const devTools = useDevTools()
  const selectedSpan = useSelectedSpan()
  const summary = useMemo(() => {
    if (selectedSpan !== undefined) {
      const startTime = Option.getOrThrow(selectedSpan.startTime)
      const endTime = Option.getOrThrow(selectedSpan.endTime)
      const date = new Date(Duration.toMillis(startTime)).toString()
      const duration = formatDuration(Duration.subtract(endTime, startTime))
      const totalSpans = getTotalSpans(selectedSpan, (node) =>
        devTools.getSpanChildren(node).map((ref) => ref.value)
      )
      return `${totalSpans} spans at ${date} (${duration})`
    }
    return ""
  }, [devTools, selectedSpan])

  return (
    <p className="ml-2 py-3">
      <span className="flex items-center text-sm text-zinc-700 dark:text-zinc-400">
        <span className="mr-2 font-bold text-black dark:text-white">
          Summary
        </span>
        <span className="mr-2">
          <Icon name="question-circle" />
        </span>
        <span>{summary}</span>
      </span>
    </p>
  )
}
