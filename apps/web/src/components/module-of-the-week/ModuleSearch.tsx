import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Check, LoaderCircle, Plus, Search } from "lucide-react"
import { useId, useMemo, useRef, useState } from "react"
import {
  addedAtom,
  coveredAtom,
  messageAtom,
  moduleIndexAtom,
  pickAtom,
  statusAtom,
  suggestingAtom,
  talliesAtom,
  votingAtom,
} from "@/features/motw-vote/atoms"
import { type ModuleRef, searchModules } from "@/features/motw-vote/domain"
import { cn } from "@/lib/utils"
import { mono, voteLabel } from "./motw-vote-text"

const isNavigationKey = (
  key: string,
): key is "ArrowDown" | "ArrowUp" | "Escape" =>
  key === "ArrowDown" || key === "ArrowUp" || key === "Escape"

export function ModuleSearch() {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const index = useAtomValue(moduleIndexAtom)
  const results = useMemo(() => searchModules(index, query), [index, query])
  const status = useAtomValue(statusAtom)
  const voting = useAtomValue(votingAtom)
  const added = useAtomValue(addedAtom)
  const suggesting = useAtomValue(suggestingAtom)
  const tallies = useAtomValue(talliesAtom)
  const covered = useAtomValue(coveredAtom)
  const setMessage = useAtomSet(messageAtom)
  const pickModule = useAtomSet(pickAtom)

  const showDrop = open && query.trim().length > 0

  const pick = (module: ModuleRef) => {
    setOpen(false)
    setQuery("")
    pickModule(module)
  }

  const submit = () => {
    if (voting) return
    const trimmed = query.trim()
    const choice = results[active] ?? results[0]
    if (!trimmed) {
      setMessage({ tone: "error", text: "Search for a module to +1." })
    } else if (!choice) {
      setMessage({
        tone: "error",
        text: `No module matches "${trimmed}". Try another name.`,
      })
    } else {
      pick(choice)
    }
  }

  const navigate = (key: "ArrowDown" | "ArrowUp" | "Escape") => {
    if (key === "Escape") return setOpen(false)
    setOpen(true)
    setActive(
      key === "ArrowDown"
        ? Math.min(active + 1, results.length - 1)
        : Math.max(active - 1, 0),
    )
  }

  return (
    <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="lg:w-1/2 lg:pr-4">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!query.trim()) inputRef.current?.focus()
            submit()
          }}
          className="relative"
        >
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
                  setMessage((message) =>
                    message?.tone === "error" ? null : message,
                  )
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={(event) => {
                  if (!isNavigationKey(event.key)) return
                  if (event.key !== "Escape") event.preventDefault()
                  navigate(event.key)
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="Search all modules"
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
                aria-invalid={status?.tone === "error"}
                className="w-full bg-transparent py-2.5 pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={voting}
              aria-busy={suggesting}
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 border-l border-border-strong px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
            >
              {suggesting ? (
                <LoaderCircle
                  className="size-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : added ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <Plus className="size-3.5" aria-hidden="true" />
              )}
              {suggesting ? "Adding" : added ? "Added" : "Suggest"}
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
                  const tally = tallies.get(module.id)
                  const isCovered = covered.includes(module.id)
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
                        pick(module)
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
                      <span className={cn("truncate", mono)}>{module.pkg}</span>
                      <span
                        className={cn("ml-auto shrink-0 tabular-nums", mono)}
                      >
                        {isCovered
                          ? "Covered"
                          : tally?.voted
                            ? "Your +1 ✓"
                            : tally && tally.votes > 0
                              ? voteLabel(tally.votes)
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
      <p
        id="module-suggestion-message"
        aria-live="polite"
        className={cn(
          "text-sm lg:flex-1",
          status?.tone === "error"
            ? "text-red-600 dark:text-red-400"
            : "text-muted-foreground",
        )}
      >
        {status ? (
          <>
            {status.text}
            {status.pkg && (
              <>
                {" "}
                <span className="font-mono leading-none">({status.pkg})</span>
              </>
            )}
            {status.suffix}
          </>
        ) : (
          "\u00a0"
        )}
      </p>
    </div>
  )
}
