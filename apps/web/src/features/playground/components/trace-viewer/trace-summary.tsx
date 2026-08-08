import { useAtomValue } from "@effect/atom-react"
import { Duration, Option } from "effect"
import { useMemo } from "react"
import { selectedSpanAtom } from "../../atoms/devtools"
import { formatDuration, getTotalSpans } from "./utils"

export function TraceSummary() {
  const selectedSpan = useAtomValue(selectedSpanAtom)
  const summary = useMemo(() => {
    if (selectedSpan !== undefined) {
      let summary = `${getTotalSpans(selectedSpan)} spans`
      if (Option.isSome(selectedSpan.startTime)) {
        const startTime = Duration.toMillis(selectedSpan.startTime.value)
        const date = new Date(startTime).toString()
        summary += ` at ${date}`
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
    <p className="ml-px py-3">
      <span className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
        <span className="mr-2 font-bold text-zinc-900 dark:text-white">
          Summary
        </span>
        <span>{summary}</span>
      </span>
    </p>
  )
}
