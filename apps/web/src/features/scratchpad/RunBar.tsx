import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Square,
} from "lucide-react"
import * as React from "react"
import {
  errorLocation,
  formatRunTime,
  type RunBlockingError,
  type RunInfo,
  type RunSkip,
  type RunsState,
} from "./runs.ts"
import type { TerminalLocation } from "./TerminalView.tsx"

const BUTTON =
  "flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11.5px] text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:disabled:hover:bg-zinc-900"

/** `0.4 s`, `12 s`, `3 min 4 s`. */
export const formatElapsed = (millis: number): string => {
  const seconds = Math.max(0, millis) / 1000
  if (seconds < 10) return `${seconds.toFixed(1)} s`
  if (seconds < 60) return `${Math.floor(seconds)} s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min ${Math.floor(seconds % 60)} s`
}

/** The current time, every `intervalMs` while `active`. */
const useNow = (active: boolean, intervalMs: number): number => {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])
  return now
}

const describeRun = (
  run: RunInfo,
): { readonly label: string; readonly dot: string; readonly text: string } => {
  switch (run.status._tag) {
    case "running":
      return {
        label: "Running",
        dot: "animate-pulse bg-blue-500 dark:bg-blue-400",
        text: "text-blue-800 dark:text-blue-200",
      }
    case "exited":
      return run.status.exitCode === 0
        ? {
            label: "Exited",
            dot: "bg-emerald-500 dark:bg-emerald-400",
            text: "text-zinc-800 dark:text-zinc-200",
          }
        : {
            label: `Exited with code ${run.status.exitCode}`,
            dot: "bg-red-500 dark:bg-red-400",
            text: "text-red-800 dark:text-red-300",
          }
    case "stopped":
      return {
        label: "Stopped",
        dot: "bg-zinc-400 dark:bg-zinc-500",
        text: "text-zinc-800 dark:text-zinc-200",
      }
    case "failed":
      return {
        label: "Could not run",
        dot: "bg-red-500 dark:bg-red-400",
        text: "text-red-800 dark:text-red-300",
      }
  }
}

export interface RunBarProps {
  readonly runs: RunsState
  readonly onStop: () => void
  readonly onRestart: () => void
}

/**
 * The bar above the terminal: the current Run's state, entry file, trigger
 * and time, how long it ran, and Stop and Restart.
 */
export function RunBar({ runs, onStop, onRestart }: RunBarProps) {
  const run = runs.run
  const running = run?.status._tag === "running"
  const now = useNow(running, 100)
  const described = run === undefined ? undefined : describeRun(run)
  return (
    <div
      data-testid="run-bar"
      className="flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-sky-50/60 px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-[#0f1520]"
    >
      <span
        aria-hidden="true"
        className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${described?.dot ?? "bg-zinc-300 dark:bg-zinc-600"}`}
      />
      {run === undefined || described === undefined ? (
        <span
          data-testid="run-bar-status"
          className="truncate text-zinc-500 dark:text-zinc-400"
        >
          {runs.available
            ? "Waiting for the first Run…"
            : "Runs start once the Container has installed the dependencies."}
        </span>
      ) : (
        <span
          data-testid="run-bar-status"
          className="flex min-w-0 items-baseline gap-1.5"
        >
          <span className={`shrink-0 ${described.text}`}>
            {described.label} <b className="font-semibold">{run.entry}</b>
          </span>
          <span className="truncate text-zinc-500 dark:text-slate-500">
            · {run.trigger} at {formatRunTime(run.startedAt)} ·{" "}
            <span data-testid="run-elapsed">
              {formatElapsed((run.endedAt ?? now) - run.startedAt)}
            </span>
            {run.status._tag === "failed" && ` · ${run.status.message}`}
          </span>
        </span>
      )}
      <span className="flex-1" />
      <button
        type="button"
        data-testid="run-stop"
        disabled={!running}
        onClick={onStop}
        className={BUTTON}
      >
        <Square className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
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
        onClick={onRestart}
        className={BUTTON}
      >
        {running ? (
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Play className="h-3 w-3" aria-hidden="true" />
        )}
        Restart
      </button>
    </div>
  )
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

const firstLine = (message: string) => message.split(/\r?\n/)[0] ?? ""

function ErrorLink({
  error,
  onOpen,
}: {
  readonly error: RunBlockingError
  readonly onOpen: (location: TerminalLocation) => void
}) {
  return (
    <button
      type="button"
      data-testid="run-skip-location"
      onClick={() =>
        onOpen({ path: error.path, line: error.line, column: error.column })
      }
      className="shrink-0 font-mono text-amber-700 underline decoration-amber-400 underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:decoration-amber-700 dark:hover:text-amber-100"
    >
      {errorLocation(error)}
    </button>
  )
}

/**
 * The banner for a skipped Run: the first error with its location as a link,
 * and the rest behind a toggle. It stays until the next Run starts.
 */
export function SkipBanner({
  skip,
  onOpenLocation,
}: {
  readonly skip: RunSkip
  readonly onOpenLocation: (location: TerminalLocation) => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const first = skip.errors[0]
  if (first === undefined) return null
  const files = new Set(skip.errors.map((error) => error.path)).size
  return (
    <div
      role="status"
      data-testid="run-skip-banner"
      className="shrink-0 border-b border-amber-200 bg-amber-50 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-[#2a1f08] dark:text-amber-200"
    >
      <div className="flex items-center gap-2 px-3 py-1.5">
        <AlertTriangle
          className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <span className="flex min-w-0 items-baseline gap-1.5">
          <b className="shrink-0 font-semibold">Run skipped:</b>
          <span className="shrink-0">
            {plural(skip.errors.length, "error")}
            {files > 1 ? ` in ${plural(files, "file")}` : ""} ·
          </span>
          <ErrorLink error={first} onOpen={onOpenLocation} />
          <span className="truncate">· {firstLine(first.message)}</span>
        </span>
        <span className="flex-1" />
        {skip.errors.length > 1 && (
          <button
            type="button"
            data-testid="run-skip-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="flex shrink-0 items-center gap-0.5 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          >
            all {skip.errors.length}
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {expanded && (
        <ul
          data-testid="run-skip-errors"
          className="max-h-40 overflow-auto border-t border-amber-200 px-3 py-1.5 dark:border-amber-900/60"
        >
          {skip.errors.map((error, index) => (
            <li
              key={`${errorLocation(error)}:${index}`}
              className="flex items-baseline gap-2 py-0.5"
            >
              <ErrorLink error={error} onOpen={onOpenLocation} />
              {error.code !== undefined && (
                <span className="shrink-0 font-mono text-red-700 dark:text-red-400">
                  {error.code}
                </span>
              )}
              <span className="min-w-0 break-words">
                {firstLine(error.message)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The typing guard's chip: the Run waits for the visitor's command. Esc (or
 * the chip's Esc) discards it and runs.
 */
export function RunWaitingChip({
  waiting,
  onDiscard,
}: {
  readonly waiting: NonNullable<RunsState["waiting"]>
  readonly onDiscard: () => void
}) {
  const key = "rounded px-1 font-semibold text-zinc-800 dark:text-zinc-100"
  return (
    <div
      role="status"
      data-testid="run-waiting"
      data-waiting={waiting}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11.5px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
    >
      <span aria-hidden="true">‖</span>
      <span className="truncate">
        {waiting === "typing" ? (
          <>
            Run waiting for your command · <b className={key}>Enter</b> to
            finish ·{" "}
          </>
        ) : (
          <>Run waiting for your command to finish · </>
        )}
        <button
          type="button"
          onClick={onDiscard}
          className={`${key} hover:bg-zinc-200 dark:hover:bg-zinc-700`}
        >
          Esc
        </button>{" "}
        to {waiting === "typing" ? "discard it" : "stop it"} and run
      </span>
    </div>
  )
}
