import type { TraceAtoms } from "../traces.ts"
import { TraceAtomsContext } from "./context.ts"
import { TraceSelector } from "./trace-selector"
import { TraceSummary } from "./trace-summary"
import { TraceWaterfall } from "./trace-waterfall"

export function TraceViewer({ atoms }: { readonly atoms: TraceAtoms }) {
  return (
    <TraceAtomsContext.Provider value={atoms}>
      <div className="flex h-full w-full flex-col bg-background text-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2">
          <TraceSelector />
          <TraceSummary />
        </div>
        <TraceWaterfall />
      </div>
    </TraceAtomsContext.Provider>
  )
}
