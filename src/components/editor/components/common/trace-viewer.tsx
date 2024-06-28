"use client"

import { TraceSelector } from "./trace-viewer/trace-selector"
import { Suspense } from "react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { TraceWaterfall } from "./trace-viewer/trace-waterfall"
import { TraceSummary } from "./trace-viewer/trace-summary"

export function TraceViewer() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div className="h-full w-full p-2 overflow-y-auto">
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
    </Suspense>
  )
}
