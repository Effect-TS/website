import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { ChevronDown, ChevronUp, Play, RotateCcw, Square } from "lucide-react"
import * as Option from "effect/Option"
import * as React from "react"
import { useScratchpadSession } from "./context.tsx"
import { RunOutputTerminal } from "./RunOutputTerminal.tsx"
import { type RunOutput, skipReport } from "./runs.ts"
import { TracesPanel } from "./TracesPanel.tsx"

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
const TAB_SELECTED = `${TAB_BASE} border-b-2 border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100`
const TAB_IDLE = `${TAB_BASE} border-b-2 border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100`

type PanelTab = "output" | "traces"

function SoonTab({ label }: { readonly label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={false}
      aria-disabled="true"
      disabled
      title={`${label} is coming soon`}
      className={`${TAB_BASE} cursor-not-allowed text-zinc-400 dark:text-zinc-600`}
    >
      {label}
      <span className="rounded border border-zinc-300 px-1 text-[9px] tracking-normal normal-case dark:border-zinc-700">
        soon
      </span>
    </button>
  )
}

export interface OutputPanelProps {
  /**
   * Rendered across the top of the panel body, above the Run output (the
   * Container failure strip). It covers nothing: the output stays below it.
   */
  readonly banner?: React.ReactNode
}

/**
 * The bottom panel under the editor: a resizable, collapsible panel with the
 * "Output" tab (the latest Run's read-only terminal), the "Traces" tab
 * (`TracesPanel`), and "Terminal", which comes later. Stop and Restart
 * control the Run.
 */
export function OutputPanel({ banner }: OutputPanelProps) {
  const {
    runStateAtom,
    runOutputAtom,
    stopRunAtom,
    restartRunAtom,
    installLogAtom,
    failureAtom,
    dependenciesUnavailableLineAtom,
    revealPositionAtom,
  } = useScratchpadSession()
  const reveal = useAtomSet(revealPositionAtom)
  const runs = useAtomValue(runStateAtom)
  const runOutput = useAtomValue(runOutputAtom)
  const installLog = useAtomValue(installLogAtom)
  const failure = useAtomValue(failureAtom)
  const dependenciesLine = useAtomValue(dependenciesUnavailableLineAtom)
  // After a failed install nothing can run, so the terminal shows pnpm's
  // output as ordinary output under the failure strip. Negative ids keep the
  // install log and Runs from being mistaken for each other.
  const installFailed =
    Option.isSome(failure) && failure.value.kind === "install-failed"
  // A skipped Run shows its type errors in the terminal, above the previous
  // Run's output (dimmed). Keyed by the skip's time so a new skip redraws.
  const skipText =
    !installFailed && runs.skipped !== undefined
      ? skipReport(runs.skipped, runOutput)
      : undefined
  const output: RunOutput = installFailed
    ? {
        runId: -installLog.run,
        text: installLog.output,
        total: installLog.output.length,
      }
    : skipText !== undefined
      ? {
          runId: -(runs.skipped?.at ?? 0),
          text: skipText,
          total: skipText.length,
        }
      : runOutput
  const stop = useAtomSet(stopRunAtom)
  const restart = useAtomSet(restartRunAtom)
  const [layout, setLayout] = React.useState(readLayout)
  const [tab, setTab] = React.useState<PanelTab>("output")
  const selectTab = (next: PanelTab) => {
    setTab(next)
    if (layout.collapsed) updateLayout({ ...layout, collapsed: false })
  }
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

  const running = runs.run?.status._tag === "running"
  const skipped = runs.skipped
  const empty =
    runs.run === undefined && skipped === undefined && !installFailed

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
          <button
            type="button"
            role="tab"
            data-testid="panel-tab-output"
            aria-selected={tab === "output"}
            onClick={() => selectTab("output")}
            className={tab === "output" ? TAB_SELECTED : TAB_IDLE}
          >
            Output
          </button>
          <SoonTab label="Terminal" />
          <button
            type="button"
            role="tab"
            data-testid="panel-tab-traces"
            aria-selected={tab === "traces"}
            onClick={() => selectTab("traces")}
            className={tab === "traces" ? TAB_SELECTED : TAB_IDLE}
          >
            Traces
          </button>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs">
          <button
            type="button"
            data-testid="run-stop"
            disabled={!running}
            onClick={() => stop()}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-zinc-700 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Square className="h-3 w-3 fill-current" aria-hidden="true" />
            Stop
          </button>
          <button
            type="button"
            data-testid="run-restart"
            disabled={!runs.available}
            title={
              runs.available
                ? "Run src/main.ts again"
                : "Runs start once the Container has installed the dependencies"
            }
            onClick={() => restart()}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-zinc-700 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {running ? (
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Play className="h-3 w-3" aria-hidden="true" />
            )}
            Restart
          </button>
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
        data-testid="run-output"
        data-run-id={runs.run?.id ?? 0}
        data-run-status={runs.run?.status._tag ?? "none"}
        data-run-skipped={skipped !== undefined}
        className={
          layout.collapsed || tab !== "output"
            ? "hidden"
            : "relative flex min-h-0 flex-1 flex-col"
        }
      >
        {banner}
        {Option.isSome(dependenciesLine) && (
          <div
            data-testid="dependencies-unavailable-line"
            className="shrink-0 px-4 pt-2 font-mono text-xs text-amber-700 dark:text-amber-400"
          >
            {dependenciesLine.value}
          </div>
        )}
        {empty && (
          <div
            data-testid="run-output-empty"
            className="shrink-0 px-4 pt-3 font-mono text-xs text-zinc-400 dark:text-zinc-500"
          >
            {runs.available
              ? "Running src/main.ts…"
              : "Your program's output appears here once the Container has installed the dependencies."}
          </div>
        )}
        <RunOutputTerminal
          output={output}
          onOpenLocation={skipText === undefined ? undefined : reveal}
        />
      </div>
      {!layout.collapsed && tab === "traces" && <TracesPanel />}
    </div>
  )
}
