import { TraceSelector } from "./trace-viewer/trace-selector"
import { TraceSummary } from "./trace-viewer/trace-summary"
import { TraceWaterfall } from "./trace-viewer/trace-waterfall"

export function TraceViewer() {
  return (
    <div className="flex h-full w-full flex-col bg-zinc-100 p-2 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex min-w-1/2 shrink items-center">
          <h1 className="mr-3 text-3xl font-bold">Trace</h1>
          <div>
            <TraceSelector />
          </div>
        </div>
      </div>
      <TraceSummary />
      <TraceWaterfall />
    </div>
  )
}
