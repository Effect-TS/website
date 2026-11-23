import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { ChevronDown, ChevronUp, Play, RotateCcw, Square } from "lucide-react"
import * as Option from "effect/Option"
import * as React from "react"
import { useScratchpadSession } from "./context.tsx"
import { RunOutputTerminal } from "./RunOutputTerminal.tsx"
import { formatRunTime, type RunOutput, type RunSkip } from "./runs.ts"

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

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

function SkipNotice({ skip }: { readonly skip: RunSkip }) {
  const { revealPositionAtom } = useScratchpadSession()
  const reveal = useAtomSet(revealPositionAtom)
  const files = [...new Set(skip.errors.map((error) => error.path))]
  return (
    <div
      data-testid="run-skip-notice"
      className="max-h-[50%] shrink-0 overflow-y-auto px-3 pt-2 pb-1 font-mono text-[13px] leading-[1.6]"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 bg-orange-500"
        />
        <span className="font-medium text-orange-600 dark:text-orange-400">
          Run skipped
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">
          · {formatRunTime(skip.at)} ·
        </span>
        <span className="text-purple-600 dark:text-purple-400">
          {skip.trigger}
        </span>
      </div>
      <div className="text-zinc-700 dark:text-zinc-300">
        <span className="text-orange-600 dark:text-orange-400">
          Run skipped:
        </span>{" "}
        <span className="font-semibold">
          {plural(skip.errors.length, "type error")} in {files.join(", ")}
        </span>{" "}
        <span className="text-zinc-400 dark:text-zinc-500">
          · fix them to run
        </span>
      </div>
      <ul>
        {skip.errors.map((error, index) => (
          <li key={index} className="flex gap-2">
            <button
              type="button"
              data-testid="run-skip-error"
              title={`Open ${error.path} at line ${error.line}, column ${error.column}`}
              onClick={() =>
                reveal({
                  path: error.path,
                  line: error.line,
                  column: error.column,
                })
              }
              className="shrink-0 cursor-pointer text-rose-600 underline decoration-rose-300 underline-offset-2 hover:text-rose-700 dark:text-rose-400 dark:decoration-rose-800 dark:hover:text-rose-300"
            >
              {error.path}:{error.line}:{error.column}
            </button>
            <span className="min-w-0 text-zinc-700 dark:text-zinc-300">
              {error.message}
            </span>
          </li>
        ))}
      </ul>
      {skip.previousRunId !== undefined && (
        <div className="mt-2 text-zinc-400 dark:text-zinc-500">
          — previous Run (#{skip.previousRunId}) —
        </div>
      )}
    </div>
  )
}

const TAB_BASE =
  "flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] tracking-wider uppercase"

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
 * "Output" tab (the latest Run's read-only terminal), plus "Terminal" and
 * "Traces", which come later. Stop and Restart control the Run.
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
  } = useScratchpadSession()
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
  const output: RunOutput = installFailed
    ? {
        runId: -installLog.run,
        text: installLog.output,
        total: installLog.output.length,
      }
    : runOutput
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
      style={layout.collapsed ? undefined : { height: layout.height }}
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
            aria-selected={true}
            onClick={() =>
              layout.collapsed && updateLayout({ ...layout, collapsed: false })
            }
            className={`${TAB_BASE} border-b-2 border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100`}
          >
            Output
          </button>
          <SoonTab label="Terminal" />
          <SoonTab label="Traces" />
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
          layout.collapsed ? "hidden" : "relative flex min-h-0 flex-1 flex-col"
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
        {skipped !== undefined && <SkipNotice skip={skipped} />}
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
          className={skipped !== undefined ? "opacity-45" : undefined}
        />
      </div>
    </div>
  )
}
