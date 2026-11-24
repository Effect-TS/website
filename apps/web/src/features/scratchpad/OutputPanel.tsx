import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { ChevronDown, ChevronUp, Eraser } from "lucide-react"
import * as Option from "effect/Option"
import * as React from "react"
import { useScratchpadSession } from "./context.tsx"
import { RunBar, RunWaitingChip, SkipBanner } from "./RunBar.tsx"
import { TerminalView } from "./TerminalView.tsx"

const HEIGHT_KEY = "scratchpad-output-panel"
const DEFAULT_HEIGHT = 260
const MIN_HEIGHT = 96

interface PanelLayout {
  readonly height: number
  readonly collapsed: boolean
}

const readLayout = (): PanelLayout => {
  try {
    const raw = localStorage.getItem(HEIGHT_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<PanelLayout>
      return {
        height:
          typeof parsed.height === "number"
            ? Math.max(MIN_HEIGHT, parsed.height)
            : DEFAULT_HEIGHT,
        collapsed: parsed.collapsed === true,
      }
    }
  } catch {
    // Storage unavailable or corrupt: use the default.
  }
  return { height: DEFAULT_HEIGHT, collapsed: false }
}

const writeLayout = (layout: PanelLayout) => {
  try {
    localStorage.setItem(HEIGHT_KEY, JSON.stringify(layout))
  } catch {
    // Storage unavailable: the layout just isn't remembered.
  }
}

const TAB_BASE =
  "flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] tracking-wider uppercase"

/**
 * The panel's tabs, in order. A tab is an entry here and a body in
 * `OutputPanel`; every body stays mounted while hidden (the terminal keeps
 * its xterm).
 */
const PANEL_TABS = [{ id: "terminal", label: "Terminal" }] as const

type PanelTabId = (typeof PANEL_TABS)[number]["id"]

export interface OutputPanelProps {
  /**
   * Rendered across the top of the panel body, above the Run bar and the
   * terminal (the Container failure strip). It covers nothing.
   */
  readonly banner?: React.ReactNode
}

/**
 * The bottom panel under the editor: a resizable, collapsible panel whose
 * "Terminal" tab is the Container's interactive shell, with the Run bar,
 * the skip banner and the typing guard's chip (ADR 0005).
 */
export function OutputPanel({ banner }: OutputPanelProps) {
  const {
    runStateAtom,
    terminalOutputAtom,
    openTerminalAtom,
    resizeTerminalAtom,
    terminalInputAtom,
    discardTerminalInputAtom,
    clearTerminalAtom,
    stopRunAtom,
    restartRunAtom,
    dependenciesUnavailableLineAtom,
    revealPositionAtom,
  } = useScratchpadSession()
  const reveal = useAtomSet(revealPositionAtom)
  const runs = useAtomValue(runStateAtom)
  const terminalOutput = useAtomValue(terminalOutputAtom)
  const dependenciesLine = useAtomValue(dependenciesUnavailableLineAtom)
  const openTerminal = useAtomSet(openTerminalAtom)
  const resizeTerminal = useAtomSet(resizeTerminalAtom)
  const terminalInput = useAtomSet(terminalInputAtom)
  const discardInput = useAtomSet(discardTerminalInputAtom)
  const clearTerminal = useAtomSet(clearTerminalAtom)
  const [tab, setTab] = React.useState<PanelTabId>("terminal")
  // Esc reaches the shell unless a Run is waiting on the visitor.
  const waitingRef = React.useRef(runs.waiting)
  waitingRef.current = runs.waiting
  const stop = useAtomSet(stopRunAtom)
  const restart = useAtomSet(restartRunAtom)
  const [layout, setLayout] = React.useState(readLayout)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const updateLayout = (next: PanelLayout) => {
    setLayout(next)
    writeLayout(next)
  }

  const onResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const startY = event.clientY
    const startHeight = layout.collapsed
      ? MIN_HEIGHT
      : (panelRef.current?.getBoundingClientRect().height ?? layout.height)
    const parentHeight =
      panelRef.current?.parentElement?.getBoundingClientRect().height ??
      window.innerHeight
    const maxHeight = Math.max(MIN_HEIGHT, parentHeight - 120)
    let height = startHeight
    const onMove = (move: PointerEvent) => {
      height = Math.min(
        maxHeight,
        Math.max(MIN_HEIGHT, startHeight - (move.clientY - startY)),
      )
      setLayout({ height, collapsed: false })
    }
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove)
      handle.removeEventListener("pointerup", onUp)
      handle.removeEventListener("pointercancel", onUp)
      writeLayout({ height, collapsed: false })
    }
    handle.addEventListener("pointermove", onMove)
    handle.addEventListener("pointerup", onUp)
    handle.addEventListener("pointercancel", onUp)
  }

  const skipped = runs.skipped

  return (
    <div
      ref={panelRef}
      data-testid="output-panel"
      data-collapsed={layout.collapsed}
      data-runs-available={runs.available}
      // A remembered height can exceed a smaller window: always leave the
      // editor room, as dragging does.
      style={
        layout.collapsed
          ? undefined
          : { height: layout.height, maxHeight: "calc(100% - 120px)" }
      }
      className="relative flex shrink-0 flex-col border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize the output panel"
        onPointerDown={onResizeStart}
        className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize hover:bg-blue-500/30"
      />
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50 pr-2 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div role="tablist" aria-label="Panel" className="flex items-center">
          {PANEL_TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              data-testid={`panel-tab-${entry.id}`}
              aria-selected={tab === entry.id}
              onClick={() => {
                setTab(entry.id)
                if (layout.collapsed)
                  updateLayout({ ...layout, collapsed: false })
              }}
              className={`${TAB_BASE} border-b-2 ${
                tab === entry.id
                  ? "border-blue-500 font-medium text-zinc-900 dark:border-blue-400 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs">
          {tab === "terminal" && (
            <button
              type="button"
              data-testid="terminal-clear"
              title="Clear the terminal"
              onClick={() => clearTerminal()}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Eraser className="h-3 w-3" aria-hidden="true" />
              Clear
            </button>
          )}
          <button
            type="button"
            data-testid="output-panel-toggle"
            aria-label={
              layout.collapsed
                ? "Expand the output panel"
                : "Collapse the output panel"
            }
            aria-expanded={!layout.collapsed}
            onClick={() =>
              updateLayout({ ...layout, collapsed: !layout.collapsed })
            }
            className="ml-1 rounded p-1 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {layout.collapsed ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <div
        role="tabpanel"
        data-testid="run-output"
        data-run-id={runs.run?.id ?? 0}
        data-run-status={runs.run?.status._tag ?? "none"}
        data-run-skipped={skipped !== undefined}
        data-run-waiting={runs.waiting ?? "none"}
        className={
          layout.collapsed || tab !== "terminal"
            ? "hidden"
            : "relative flex min-h-0 flex-1 flex-col"
        }
      >
        {banner}
        {Option.isSome(dependenciesLine) && (
          <div
            data-testid="dependencies-unavailable-line"
            className="shrink-0 border-b border-zinc-200 px-3 py-1.5 font-mono text-xs text-amber-700 dark:border-zinc-800 dark:text-amber-400"
          >
            {dependenciesLine.value}
          </div>
        )}
        <RunBar runs={runs} onStop={() => stop()} onRestart={() => restart()} />
        {skipped !== undefined && (
          <SkipBanner key={skipped.at} skip={skipped} onOpenLocation={reveal} />
        )}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <TerminalView
            output={terminalOutput}
            onOpen={(size) => openTerminal(size)}
            onResize={(size) => resizeTerminal(size)}
            onData={(data) => terminalInput(data)}
            onEscape={() => {
              if (waitingRef.current === undefined) return false
              discardInput()
              return true
            }}
            onOpenLocation={reveal}
          />
          {runs.waiting !== undefined && (
            // Below the terminal, so it covers none of the prompt.
            <div className="shrink-0 px-3 pb-2">
              <RunWaitingChip
                waiting={runs.waiting}
                onDiscard={() => discardInput()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
