"use client"

import { TraceSelector } from "./trace-viewer/trace-selector"
import { Suspense } from "react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { TraceWaterfall } from "./trace-viewer/trace-waterfall"
import { TraceSummary } from "./trace-viewer/trace-summary"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { devToolsRx } from "@/workspaces/rx/devtools"
import { DevToolsContext } from "@/workspaces/context/devtools"

export function TraceViewer() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DevToolsProvider>
        <div className="flex flex-col w-full p-2">
          <div className="flex justify-between items-center">
            <div className="min-w-1/2 flex items-center shrink">
              <h1 className="mr-3 text-3xl font-display">Trace</h1>
              <div>
                <TraceSelector />
              </div>
            </div>
          </div>
          <TraceSummary />
          <TraceWaterfall />
        </div>
      </DevToolsProvider>
    </Suspense>
  )
}

function DevToolsProvider({ children }: React.PropsWithChildren) {
  const devTools = useRxSuspenseSuccess(devToolsRx).value
  return (
    <DevToolsContext.Provider value={devTools}>
      {children}
    </DevToolsContext.Provider>
  )
}
