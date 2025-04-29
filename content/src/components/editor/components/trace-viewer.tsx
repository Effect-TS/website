import { TraceSelector } from "./trace-viewer/trace-selector"
import { TraceWaterfall } from "./trace-viewer/trace-waterfall"
import { TraceSummary } from "./trace-viewer/trace-summary"
import { useRxMount } from "@effect-rx/rx-react"
import { devToolsRx } from "../rx/devtools"

export function TraceViewer() {
  useRxMount(devToolsRx)

  return (
    <div className="h-full flex flex-col w-full p-2 bg-[--sl-color-bg-nav]">
      <div className="flex justify-between items-center">
        <div className="min-w-1/2 flex items-center shrink">
          <h1 className="mr-3 !text-3xl">Trace</h1>
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
