import { useAtomValue } from "@effect/atom-react"
import { TraceViewer } from "@/features/devtools/components/trace-viewer"
import { useScratchpadSession } from "./context.tsx"

/**
 * The bottom panel's "Traces" tab: the spans the latest Run reported through
 * `DevTools.layer` (the seed's `src/DevTools.ts`), in `/play`'s trace viewer.
 * A new Run clears them.
 */
export function TracesPanel() {
  const { traceAtoms } = useScratchpadSession()
  const roots = useAtomValue(traceAtoms.rootSpansAtom)
  return (
    <div
      data-testid="traces-panel"
      data-trace-count={roots.length}
      className="min-h-0 flex-1 overflow-auto"
    >
      {roots.length === 0 ? (
        <div
          data-testid="traces-empty"
          className="px-4 pt-3 font-mono text-xs text-zinc-400 dark:text-zinc-500"
        >
          Spans from the current Run appear here. Provide{" "}
          <code>DevToolsLayer</code> from <code>src/DevTools.ts</code> to your
          program to report them.
        </div>
      ) : (
        <TraceViewer atoms={traceAtoms} />
      )}
    </div>
  )
}
