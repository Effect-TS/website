import { useAtom, useAtomValue } from "@effect/atom-react"
import { selectedSpanIndexAtom } from "../../atoms/devtools"
import { rootSpansAtom } from "../../services/devtools"

export function TraceSelector() {
  const rootSpans = useAtomValue(rootSpansAtom)
  const [selectedIndex, setSelectedIndex] = useAtom(selectedSpanIndexAtom)

  return (
    <select
      aria-label="Select a trace"
      className="min-h-9 min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
      value={rootSpans.length ? selectedIndex : ""}
      onChange={(event) => setSelectedIndex(Number(event.target.value))}
    >
      {rootSpans.length === 0 && <option value="">No traces found</option>}
      {rootSpans.map((root, index) => (
        <option key={root.traceId} value={index}>
          {root.label}: {root.traceId}
        </option>
      ))}
    </select>
  )
}
