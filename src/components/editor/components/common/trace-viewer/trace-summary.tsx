import React, { useMemo } from "react"
import { Duration, Option } from "effect"
import { useRxSuspenseSuccess, useRxValue } from "@effect-rx/rx-react"
import { Icon } from "@/components/icons"
import { devToolsRx } from "@/workspaces/rx/devtools"
import { formatDuration, getTotalSpans } from "./utils"

export function TraceSummary() {
  const devTools = useRxSuspenseSuccess(devToolsRx).value
  const traces = useRxValue(devTools.traces)
  const selected = useRxValue(devTools.selectedTrace)
  const summary = useMemo(() => {
    const trace = traces[selected]
    if (trace !== undefined) {
      const startTime = Option.getOrThrow(trace.startTime)
      const endTime = Option.getOrThrow(trace.endTime)
      const date = new Date(Duration.toMillis(startTime)).toString()
      const duration = formatDuration(Duration.subtract(endTime, startTime))
      const totalSpans = getTotalSpans(trace, (node) =>
        devTools.getSpanChildren(node)
      )
      return `${totalSpans} spans at ${date} (${duration})`
    }
    return ""
  }, [devTools, selected, traces])
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
