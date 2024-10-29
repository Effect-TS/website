import { useMemo } from "react"
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons"
import { Duration, Option } from "effect"
import { useSelectedSpanValue } from "../../context/devtools"
import { formatDuration, getTotalSpans } from "./utils"

export function TraceSummary() {
  const selectedSpan = useSelectedSpanValue()
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
      <span className="flex items-center text-sm text-[--sl-color-text]">
        <span className="mr-2 text-[--sl-color-white] font-bold">
          Summary
        </span>
        <span className="mr-2">
          <QuestionMarkCircledIcon />
        </span>
        <span>{summary}</span>
      </span>
    </p>
  )
}
