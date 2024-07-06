import React, { useMemo } from "react"
import { Duration, Option } from "effect"
import { Icon } from "@/components/icons"
import { useSelectedSpanValue } from "@/workspaces/context/devtools"
import { formatDuration, getTotalSpans } from "./utils"

export function TraceSummary() {
  const selectedSpan = useSelectedSpanValue()
  const summary = useMemo(() => {
    if (selectedSpan !== undefined) {
      let summary = `${getTotalSpans(selectedSpan)} spans`
      if (Option.isSome(selectedSpan.startTime)) {
        const startTime = Duration.toMillis(selectedSpan.startTime.value)
        const date = new Date(startTime).toString()
        summary +=  ` at ${date}`
      }
      if (Option.isSome(selectedSpan.duration)) {
        const duration = formatDuration(selectedSpan.duration.value)
        summary += ` (${duration})`
      }
      return summary
    }
    return ""
  }, [selectedSpan])

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
