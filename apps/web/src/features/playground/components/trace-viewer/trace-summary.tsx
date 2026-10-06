import { useAtomValue } from "@effect/atom-react"
import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import { useMemo } from "react"
import { selectedSpanAtom } from "../../atoms/devtools"
import { formatDuration, getTotalSpans } from "./utils"

export function TraceSummary() {
  const selectedSpan = useAtomValue(selectedSpanAtom)
  const items = useMemo(() => {
    if (selectedSpan === undefined) return []
    const total = getTotalSpans(selectedSpan)
    const items = [`${total} ${total === 1 ? "span" : "spans"}`]
    if (Option.isSome(selectedSpan.duration)) {
      items.push(formatDuration(selectedSpan.duration.value))
    }
    if (Option.isSome(selectedSpan.startTime)) {
      const startTime = Duration.toMillis(selectedSpan.startTime.value)
      items.push(new Date(startTime).toLocaleString())
    }
    return items
  }, [selectedSpan])

  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
      {items.map((item, index) => (
        <li key={index} className="flex items-center gap-3">
          {index > 0 && (
            <span aria-hidden className="text-subtle-foreground">
              /
            </span>
          )}
          {item}
        </li>
      ))}
    </ul>
  )
}
