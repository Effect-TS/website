import * as React from "react"
import type { TraceAtoms } from "../traces.ts"

export const TraceAtomsContext = React.createContext<TraceAtoms | null>(null)

/** The trace store of the enclosing `TraceViewer`. */
export const useTraceAtoms = (): TraceAtoms => {
  const atoms = React.useContext(TraceAtomsContext)
  if (atoms === null) {
    throw new Error("Trace viewer parts must be rendered inside a TraceViewer")
  }
  return atoms
}
