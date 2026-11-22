import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as Option from "effect/Option"
import { FileCode2, X } from "lucide-react"
import * as React from "react"
import { useScratchpadSession } from "./context.tsx"
import { StatusIndicator } from "./StatusIndicator.tsx"

const basenameOf = (path: string): string => {
  const idx = path.lastIndexOf("/")
  return idx === -1 ? path : path.slice(idx + 1)
}

export function EditorTabs() {
  const {
    openTabsAtom,
    activeFileAtom,
    diagnosticsAtom,
    openFileAtom,
    closeTabAtom,
  } = useScratchpadSession()

  const openTabs = useAtomValue(openTabsAtom)
  const activeFile = useAtomValue(activeFileAtom)
  const diagnostics = useAtomValue(diagnosticsAtom)
  const openFile = useAtomSet(openFileAtom)
  const closeTab = useAtomSet(closeTabAtom)

  // Disambiguate tabs that share the same basename
  const basenameCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const tab of openTabs) {
      const base = basenameOf(tab)
      counts.set(base, (counts.get(base) ?? 0) + 1)
    }
    return counts
  }, [openTabs])

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 pr-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div
        role="tablist"
        aria-label="Open files"
        data-testid="scratchpad-tabs"
        className="flex min-w-0 flex-1 items-center overflow-x-auto"
      >
        {openTabs.map((tabPath) => {
          const isActive =
            Option.isSome(activeFile) && activeFile.value === tabPath
          const base = basenameOf(tabPath)
          const label = (basenameCounts.get(base) ?? 0) > 1 ? tabPath : base
          const diag = diagnostics.get(tabPath)
          const hasErrors = (diag?.errors ?? 0) > 0
          const hasWarnings = !hasErrors && (diag?.warnings ?? 0) > 0

          return (
            <div
              key={tabPath}
              role="tab"
              aria-selected={isActive}
              title={tabPath}
              data-testid={`editor-tab-${tabPath}`}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault()
                  closeTab(tabPath)
                }
              }}
              className={
                isActive
                  ? "group flex shrink-0 items-center gap-1.5 border-r border-b-2 border-r-zinc-200 border-b-blue-500 bg-white px-3 py-2 font-mono text-xs font-medium text-zinc-950 dark:border-r-zinc-800 dark:border-b-blue-400 dark:bg-zinc-950 dark:text-zinc-50"
                  : "group flex shrink-0 items-center gap-1.5 border-r border-r-zinc-200 px-3 py-2 font-mono text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-r-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              }
            >
              <button
                type="button"
                onClick={() => openFile(tabPath)}
                className="flex items-center gap-1.5"
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
                <span>{label}</span>
                {hasErrors && (
                  <span
                    aria-label={`${diag?.errors} errors`}
                    className="h-1.5 w-1.5 rounded-full bg-red-500"
                  />
                )}
                {hasWarnings && (
                  <span
                    aria-label={`${diag?.warnings} warnings`}
                    className="h-1.5 w-1.5 rounded-full bg-amber-500"
                  />
                )}
              </button>
              <button
                type="button"
                aria-label={`Close ${tabPath}`}
                data-testid={`close-tab-${tabPath}`}
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tabPath)
                }}
                className="ml-0.5 rounded p-0.5 text-zinc-400 opacity-70 hover:bg-zinc-200 hover:text-zinc-900 hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>

      <div className="shrink-0 py-1.5">
        <StatusIndicator />
      </div>
    </div>
  )
}
