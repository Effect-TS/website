import { TraceSelector } from "./trace-viewer/trace-selector"
import { TraceSummary } from "./trace-viewer/trace-summary"
import { TraceWaterfall } from "./trace-viewer/trace-waterfall"

export function TraceViewer() {
  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2">
        <TraceSelector />
        <TraceSummary />
      </div>
      <TraceWaterfall />
    </div>
  )
}
