import type { TraceAtoms } from "../traces.ts"
import { TraceAtomsContext } from "./context.ts"
import { TracePicker } from "./trace-picker"
import { TraceWaterfall } from "./trace-waterfall"

export function TraceViewer({ atoms }: { readonly atoms: TraceAtoms }) {
  return (
    <TraceAtomsContext.Provider value={atoms}>
      <div className="flex h-full w-full flex-col bg-background text-foreground">
        <TracePicker />
        <TraceWaterfall />
      </div>
    </TraceAtomsContext.Provider>
  )
}
