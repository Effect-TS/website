import { ArrowUp, ChevronDown, Plus, Search } from "lucide-react"
import {
  type SubmitEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  type ModuleRef,
  type RankedModule,
  type MotwVoteStore,
  searchModules,
  VoteRefused,
} from "@/features/motw-vote/domain"
import { makeHttpStore } from "@/features/motw-vote/http-store"
import {
  ChallengeUnavailable,
  solveChallenge,
} from "@/features/motw-vote/turnstile-client"
import { cn } from "@/lib/utils"

/** Modules shown at first, and added per "Show more" (three rows of four on desktop). */
const STEP = 12

const byVotes = (a: RankedModule, b: RankedModule) =>
  b.votes - a.votes || a.name.localeCompare(b.name)

const voteLabel = (n: number) => `${n} ${n === 1 ? "vote" : "votes"}`

const refusalText = (error: unknown, name: string): string => {
  if (error instanceof ChallengeUnavailable)
    return "The bot check could not run. Turn off content blockers or try another browser, then try again."
  if (error instanceof VoteRefused) {
    switch (error.reason) {
      case "RateLimited":
        return "Too many votes in a short time. Try again in a minute."
      case "Covered":
        return `${name} has already been covered.`
      case "UnknownModule":
        return `${name} is not a module we can cover.`
      case "InvalidVoter":
        return "Your voting session is not valid. Reload the page and try again."
      case "ChallengeFailed":
        return "We could not tell you are not a bot, so your +1 was not saved."
    }
  }
  return "Couldn't save your +1. Try again."
}

const CHECKING = "Checking you are not a bot…"

const mono = "font-mono text-xs text-muted-foreground"

/**
 * "What should we cover next?": people search the module list and +1 the ones
 * they want covered. The ranking's order is fixed for the visit (sorted on
 * load and when a module joins), so a row never moves away from the pointer.
 */
export function MotwVote({
  moduleIndex,
  covered = [],
  store: storeProp,
}: {
  readonly moduleIndex: ReadonlyArray<ModuleRef>
  /** Ids of modules the series already covered: shown in search, not votable. */
  readonly covered?: ReadonlyArray<string>
  readonly store?: MotwVoteStore
}) {
  const store = useMemo(
    () => storeProp ?? makeHttpStore(moduleIndex),
    [storeProp, moduleIndex],
  )
  const [requests, setRequests] = useState<ReadonlyArray<RankedModule> | null>(
    null,
  )
  const [order, setOrder] = useState<ReadonlyArray<string>>([])
  const [count, setCount] = useState(STEP)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [message, setMessage] = useState<{
    tone: "ok" | "error"
    text: string
  } | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const challengeRef = useRef<HTMLDivElement>(null)
  const [siteKey, setSiteKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const busyRef = useRef(false)

  useEffect(() => {
    let current = true
    store
      .list()
      .then(({ requests: list, turnstileSiteKey }) => {
        if (!current) return
        setFailed(false)
        setSiteKey(turnstileSiteKey)
        setRequests(list)
        setOrder([...list].sort(byVotes).map(({ id }) => id))
      })
      .catch(() => {
        if (!current) return
        setFailed(true)
        setRequests([])
        setMessage({
          tone: "error",
          text: "Couldn't load the suggestions. Try again later.",
        })
      })
    return () => {
      current = false
    }
  }, [store, attempt])

  const retryLoad = () => {
    setRequests(null)
    setMessage(null)
    setAttempt((n) => n + 1)
  }

  /** One vote request at a time, so a first vote cannot create two voters. */
  const exclusive = async (task: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await task()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const ordered = useMemo(() => {
    const byId = new Map(
      (requests ?? []).map((request) => [request.id, request]),
    )
    return order.flatMap((id) => byId.get(id) ?? [])
  }, [requests, order])

  const votesById = useMemo(
    () => new Map((requests ?? []).map((request) => [request.id, request])),
    [requests],
  )
  const coveredIds = useMemo(() => new Set(covered), [covered])
  const results = useMemo(
    () => searchModules(moduleIndex, query),
    [moduleIndex, query],
  )

  const flash = (id: string) => {
    setHighlight(id)
    window.setTimeout(
      () => setHighlight((current) => (current === id ? null : current)),
      2400,
    )
  }

  /** The token of an invisible check, which a new +1 needs. */
  const humanToken = async (): Promise<string> => {
    if (siteKey === null || challengeRef.current === null)
      throw new Error("No human check")
    setChecking(true)
    try {
      return await solveChallenge(siteKey, challengeRef.current)
    } finally {
      setChecking(false)
    }
  }

  const toggleVote = (request: RankedModule) =>
    exclusive(async () => {
      try {
        const on = !request.voted
        const updated = await store.vote(
          request,
          on,
          on ? await humanToken() : undefined,
        )
        setRequests((list) =>
          (list ?? []).map((item) => (item.id === updated.id ? updated : item)),
        )
        setMessage(null)
      } catch (error) {
        setMessage({ tone: "error", text: refusalText(error, request.name) })
      }
    })

  /** +1 a module picked from the search. */
  const pick = (module: ModuleRef) => {
    if (busyRef.current) return Promise.resolve()
    setOpen(false)
    setQuery("")
    if (coveredIds.has(module.id)) {
      setMessage({
        tone: "error",
        text: `${module.name} has already been covered. Find it in the modules above.`,
      })
      return Promise.resolve()
    }
    return exclusive(async () => {
      // Name plus package, since some names exist in more than one package
      const label = `${module.name} (${module.pkg})`
      const existing = votesById.get(module.id)
      const wasVoted = existing?.voted ?? false
      let list: ReadonlyArray<RankedModule>
      try {
        if (!wasVoted) await store.vote(module, true, await humanToken())
        list = (await store.list()).requests
      } catch (error) {
        setMessage({ tone: "error", text: refusalText(error, module.name) })
        return
      }
      setRequests(list)
      const nextOrder = existing
        ? order
        : [...list].sort(byVotes).map(({ id }) => id)
      if (!existing) setOrder(nextOrder)
      setMessage({
        tone: "ok",
        text: wasVoted
          ? `You've already +1'd ${label}.`
          : existing
            ? `+1 added to ${label}.`
            : `Added ${label} with your +1.`,
      })
      // Make sure its row is on screen, then mark it
      const index = nextOrder.indexOf(module.id)
      if (index >= 0)
        setCount((c) => (index >= c ? Math.ceil((index + 1) / STEP) * STEP : c))
      flash(module.id)
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busyRef.current) return
    const choice = results[active] ?? results[0]
    if (!query.trim()) {
      inputRef.current?.focus()
      setMessage({ tone: "error", text: "Search for a module to +1." })
    } else if (!choice) {
      setMessage({
        tone: "error",
        text: `No module matches "${query.trim()}". Try another name.`,
      })
    } else {
      void pick(choice)
    }
  }

  const status = checking ? { tone: "ok" as const, text: CHECKING } : message
  const total = ordered.length
  const shown = Math.min(total, count)
  const smFill = shown % 2
  const lgFill = (4 - (shown % 4)) % 4
  const fillers = Array.from({ length: Math.max(smFill, lgFill) }, (_, n) => n)
  const showDrop = open && query.trim().length > 0

  return (
    <section
      id="vote"
      aria-labelledby="requests-title"
      className="scroll-mt-16"
    >
      <div className="mx-auto w-full max-w-295 px-4 py-24 md:pt-40">
        <div className="lg:w-1/2 lg:pr-4">
          <p className="mb-3 font-mono text-sm font-medium tracking-wider text-muted-foreground uppercase">
            {"// Vote for the next module"}
          </p>
          <h2
            id="requests-title"
            className="text-2xl leading-tighter font-bold text-foreground md:text-3xl"
          >
            What should we cover next?
          </h2>

          <form onSubmit={submit} className="relative mt-8">
            <label htmlFor="module-search" className="sr-only">
              Search for a module to +1
            </label>
            <div className="flex overflow-hidden rounded-md border border-border-strong transition-colors focus-within:border-muted-foreground">
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  ref={inputRef}
                  id="module-search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setActive(0)
                    setOpen(true)
                    if (message?.tone === "error") setMessage(null)
                  }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                  onKeyDown={onKeyDown}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={`Search ${moduleIndex.length} modules`}
                  role="combobox"
                  aria-expanded={showDrop}
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    showDrop && results[active]
                      ? `${listboxId}-${active}`
                      : undefined
                  }
                  aria-describedby="module-suggestion-message"
                  aria-invalid={message?.tone === "error"}
                  className="w-full bg-transparent py-2.5 pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex shrink-0 cursor-pointer items-center gap-2 border-l border-border-strong px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Suggest
              </button>
            </div>

            {showDrop && (
              <div
                id={listboxId}
                role="listbox"
                aria-label="Matching modules"
                className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-md border border-border-strong bg-background shadow-lg shadow-black/20"
              >
                {results.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No module matches “{query.trim()}”
                  </div>
                ) : (
                  results.map((module, i) => {
                    const request = votesById.get(module.id)
                    const isCovered = coveredIds.has(module.id)
                    return (
                      <div
                        key={module.id}
                        tabIndex={-1}
                        id={`${listboxId}-${i}`}
                        role="option"
                        aria-selected={i === active}
                        aria-disabled={isCovered}
                        onMouseDown={(event) => {
                          event.preventDefault()
                          void pick(module)
                        }}
                        onMouseEnter={() => setActive(i)}
                        className={cn(
                          "flex cursor-pointer items-baseline gap-3 px-4 py-2.5 text-sm",
                          i === active && "bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "font-medium",
                            isCovered
                              ? "text-subtle-foreground"
                              : "text-foreground",
                          )}
                        >
                          {module.name}
                        </span>
                        <span className={cn("truncate", mono)}>
                          {module.pkg}
                        </span>
                        <span
                          className={cn("ml-auto shrink-0 tabular-nums", mono)}
                        >
                          {isCovered
                            ? "Covered"
                            : request?.voted
                              ? "Your +1 ✓"
                              : request && request.votes > 0
                                ? voteLabel(request.votes)
                                : "+1"}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </form>
        </div>

        <div className="mt-12 border border-border">
          {requests === null ? (
            <p className="px-4 py-6 text-sm text-muted-foreground lg:px-5">
              Loading suggestions…
            </p>
          ) : failed ? (
            <button
              type="button"
              onClick={retryLoad}
              className="flex w-full cursor-pointer items-center justify-center px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              Try again
            </button>
          ) : total === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground lg:px-5">
              No suggestions yet. Search for a module above and be the first to
              +1 it.
            </p>
          ) : (
            <ol className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
              {ordered.slice(0, count).map((request, i) => (
                <li
                  key={request.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 transition-colors duration-700 lg:px-5",
                    highlight === request.id ? "bg-muted" : "bg-background",
                  )}
                >
                  <span className="w-6 shrink-0 font-mono text-xs font-medium text-subtle-foreground tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {request.name}
                    </span>
                    <span className={cn("truncate", mono)}>{request.pkg}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleVote(request)}
                    disabled={busy}
                    aria-pressed={request.voted}
                    aria-label={`${request.voted ? "Remove your +1 from" : "+1"} ${request.name}, ${voteLabel(request.votes)}`}
                    className={cn(
                      "inline-flex min-w-14 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      request.voted
                        ? "border-foreground bg-foreground text-background"
                        : "border-border-strong text-muted-foreground enabled:hover:border-muted-foreground enabled:hover:text-foreground",
                    )}
                  >
                    <ArrowUp className="size-3" aria-hidden="true" />
                    {request.votes}
                  </button>
                </li>
              ))}
              {fillers.map((n) => (
                <li
                  key={`filler-${n}`}
                  aria-hidden="true"
                  className={cn(
                    "hidden bg-background",
                    n < smFill ? "sm:block" : "sm:hidden",
                    n < lgFill ? "lg:block" : "lg:hidden",
                  )}
                />
              ))}
            </ol>
          )}

          {(total > count || count > STEP) && (
            <div className="flex border-t border-border">
              {total > count && (
                <button
                  type="button"
                  onClick={() => setCount((c) => c + STEP)}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  Show more
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </button>
              )}
              {count > STEP && (
                <button
                  type="button"
                  onClick={() => setCount(STEP)}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-l border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors first:border-l-0 hover:bg-muted/60 hover:text-foreground"
                >
                  Show fewer
                  <ChevronDown
                    className="size-3.5 rotate-180"
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
          )}
        </div>

        <p
          id="module-suggestion-message"
          aria-live="polite"
          className={cn(
            "text-sm",
            status
              ? cn(
                  "mt-3",
                  status.tone === "error"
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground",
                )
              : "sr-only",
          )}
        >
          {status?.text}
        </p>
      </div>
      <div ref={challengeRef} aria-hidden="true" />
    </section>
  )
}
