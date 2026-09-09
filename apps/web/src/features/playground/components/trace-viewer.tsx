import { TraceSelector } from "./trace-viewer/trace-selector"
import { TraceSummary } from "./trace-viewer/trace-summary"
import { TraceWaterfall } from "./trace-viewer/trace-waterfall"

export function TraceViewer() {
  return (
    <div className="flex h-full min-h-80 w-full flex-col bg-control-background p-2">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="text-3xl font-bold">Trace</h2>
          <div className="min-w-0 max-w-full">
            <TraceSelector />
          </div>
        </div>
      </div>
      <TraceSummary />
      <TraceWaterfall />
    </div>
  )
}
