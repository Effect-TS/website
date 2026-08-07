import {
  ChevronDownIcon,
  ChevronUpIcon,
  PauseIcon,
  PlayIcon,
  RadarIcon,
} from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import type { EmbedState } from "../domain"
import {
  useEmbedDebugInfo,
  useEmbedControls,
  useEmbedPreview,
  useEmbedState,
} from "../context"

export function YouTubeEmbedDebugger() {
  const debugInfo = useEmbedDebugInfo()
  const state = useEmbedState()
  const [isPreviewing] = useEmbedPreview()
  const { play, pause, seekTo } = useEmbedControls()
  const [isOpen, setOpen] = React.useState(false)
  const [seekSeconds, setSeekSeconds] = React.useState("0")
  const [selectedLabels, setSelectedLabels] = React.useState<
    ReadonlySet<string>
  >(() => new Set())

  const events = React.useMemo(
    () =>
      debugInfo.map((raw) => {
        const parsed = parseDebugEvent(raw)
        const label = getDebugEventLabel(parsed)
        return { raw, parsed, label }
      }),
    [debugInfo],
  )

  const eventCounts = React.useMemo(() => {
    const counts = new Map<string, number>()

    for (const event of events) {
      counts.set(event.label, (counts.get(event.label) ?? 0) + 1)
    }

    return Array.from(counts.entries()).sort(([left], [right]) =>
      left.localeCompare(right),
    )
  }, [events])

  const availableLabels = React.useMemo(
    () => new Set(eventCounts.map(([label]) => label)),
    [eventCounts],
  )

  const filteredEvents = React.useMemo(() => {
    if (selectedLabels.size === 0) return events
    return events.filter((event) => selectedLabels.has(event.label))
  }, [events, selectedLabels])

  React.useEffect(() => {
    setSelectedLabels((current) => {
      const next = new Set(
        Array.from(current).filter((label) => availableLabels.has(label)),
      )
      return next.size === current.size ? current : next
    })
  }, [availableLabels])

  const toggleLabel = React.useCallback((label: string) => {
    setSelectedLabels((current) => {
      const next = new Set(current)

      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }

      return next
    })
  }, [])

  const clearFilters = React.useCallback(() => {
    setSelectedLabels(new Set())
  }, [])

  const submitSeekTo = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const seconds = Number(seekSeconds)
      if (!Number.isFinite(seconds) || seconds < 0) {
        return
      }

      seekTo(seconds)
    },
    [seekSeconds, seekTo],
  )

  return (
    <div className="pointer-events-none absolute top-2 right-2 z-20 flex max-h-[calc(100%-1rem)] w-[min(28rem,calc(100%-1rem))] justify-end">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto inline-flex cursor-pointer items-center gap-2 rounded-full border border-cyan-400/30 bg-zinc-950/90 px-3 py-1.5 font-mono text-[11px] text-cyan-100 shadow-lg shadow-black/35 backdrop-blur-md transition hover:border-cyan-300/50 hover:bg-zinc-950"
        >
          <RadarIcon className="h-3.5 w-3.5" />
          <span>debug</span>
          <span className="rounded-full bg-cyan-400/12 px-1.5 py-0.5 text-[10px] text-cyan-200">
            {debugInfo.length}
          </span>
        </button>
      )}

      {isOpen && (
        <section className="pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-cyan-500/20 bg-zinc-950/94 text-zinc-100 shadow-2xl shadow-black/45 backdrop-blur-md">
          <header className="flex items-start justify-between gap-3 border-b border-zinc-800/90 px-3 py-2.5">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatePill label="state" value={state._tag} accent="cyan" />
                <StatePill
                  label="playback"
                  value={getEmbedPlaybackLabel(state)}
                  accent="emerald"
                />
                <StatePill
                  label="preview"
                  value={isPreviewing ? "poster" : "iframe"}
                  accent="amber"
                />
                <StatePill
                  label="events"
                  value={String(debugInfo.length)}
                  accent="rose"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ControlButton label="Play" onClick={play}>
                  <PlayIcon className="h-3 w-3" />
                </ControlButton>
                <ControlButton label="Pause" onClick={pause}>
                  <PauseIcon className="h-3 w-3" />
                </ControlButton>
                <form
                  onSubmit={submitSeekTo}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    value={seekSeconds}
                    onChange={(event) => setSeekSeconds(event.target.value)}
                    className="w-18 rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-1 font-mono text-[11px] transition outline-none focus:border-cyan-400/60"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 font-mono text-[11px] text-cyan-100 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
                  >
                    Seek
                  </button>
                </form>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-zinc-700 bg-zinc-900/80 p-1.5 text-zinc-300 transition hover:border-zinc-500 hover:text-white"
              aria-label="Collapse YouTube debugger"
            >
              <ChevronUpIcon className="h-4 w-4" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {eventCounts.map(([label, count]) => {
                  const isActive =
                    selectedLabels.size === 0 || selectedLabels.has(label)

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleLabel(label)}
                      className={cn(
                        "rounded-full border px-2 py-1 font-mono text-[10px] transition",
                        isActive
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
                          : "border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200",
                      )}
                    >
                      {label} {count}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={clearFilters}
                disabled={selectedLabels.size === 0}
                className="rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-1 font-mono text-[10px] text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-default disabled:opacity-40"
              >
                clear
              </button>
            </div>

            <div className="grid gap-2 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <section className="overflow-hidden rounded-xl border border-zinc-800 bg-black/15">
                <div className="flex items-center justify-between border-b border-zinc-800 px-2.5 py-1.5">
                  <p className="font-mono text-[10px] tracking-[0.22em] text-zinc-400 uppercase">
                    state
                  </p>
                  <ChevronDownIcon className="h-3 w-3 text-zinc-500" />
                </div>
                <pre className="overflow-x-auto px-2.5 py-2 font-mono text-[10px] leading-4 text-zinc-300">
                  <code>{JSON.stringify(state, null, 2)}</code>
                </pre>
              </section>

              <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black/15">
                <div className="flex items-center justify-between border-b border-zinc-800 px-2.5 py-1.5">
                  <p className="font-mono text-[10px] tracking-[0.22em] text-zinc-400 uppercase">
                    events
                  </p>
                  <div className="font-mono text-[10px] text-zinc-500">
                    {filteredEvents.length}
                  </div>
                </div>

                <div className="min-h-44 overflow-y-auto px-2 py-2">
                  {filteredEvents.length === 0 && (
                    <div className="rounded-lg border border-dashed border-zinc-700/80 bg-zinc-900/60 px-2.5 py-3 font-mono text-[10px] text-zinc-400">
                      Waiting for matching events.
                    </div>
                  )}

                  <div className="space-y-2">
                    {filteredEvents
                      .slice()
                      .reverse()
                      .map((event, index) => (
                        <article
                          key={`${event.label}-${index}`}
                          className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-2 py-1.5">
                            <p className="truncate font-mono text-[10px] text-zinc-200">
                              {event.label}
                            </p>
                            <span className="font-mono text-[10px] text-zinc-500">
                              #{filteredEvents.length - index}
                            </span>
                          </div>
                          <pre className="overflow-x-auto px-2 py-1.5 font-mono text-[10px] leading-4 text-zinc-300">
                            <code>
                              {formatDebugEvent(event.parsed, event.raw)}
                            </code>
                          </pre>
                        </article>
                      ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function ControlButton({
  children,
  label,
  onClick,
}: {
  readonly children: React.ReactNode
  readonly label: string
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-1 font-mono text-[11px] text-zinc-200 transition hover:border-zinc-500 hover:text-white"
    >
      {children}
      <span>{label}</span>
    </button>
  )
}

function StatePill({
  accent,
  label,
  value,
}: {
  readonly accent: "amber" | "cyan" | "emerald" | "rose"
  readonly label: string
  readonly value: string
}) {
  return (
    <div
      className={cn(
        "rounded-full border px-2 py-1 font-mono text-[10px]",
        accent === "cyan" && "border-cyan-500/30 bg-cyan-500/10 text-cyan-100",
        accent === "emerald" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
        accent === "amber" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-100",
        accent === "rose" && "border-rose-500/30 bg-rose-500/10 text-rose-100",
      )}
    >
      <span className="text-zinc-400">{label}: </span>
      <span>{value}</span>
    </div>
  )
}

const parseDebugEvent = (event: string): unknown => {
  try {
    return JSON.parse(event)
  } catch {
    return null
  }
}

const getDebugEventLabel = (event: unknown): string => {
  if (event !== null && typeof event === "object") {
    const maybeEvent = Reflect.get(event, "event")
    if (typeof maybeEvent === "string") {
      return maybeEvent
    }
  }

  return "unknown"
}

const formatDebugEvent = (parsed: unknown, raw: string): string => {
  if (parsed === null) return raw
  return JSON.stringify(parsed, null, 2)
}

const getEmbedPlaybackLabel = (state: EmbedState): string => {
  if (state._tag !== "Active") return "-"
  return state.playback._tag
}
