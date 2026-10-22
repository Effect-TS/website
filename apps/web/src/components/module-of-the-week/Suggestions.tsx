import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import { ArrowUp, ChevronDown } from "lucide-react"
import {
  STEP,
  countAtom,
  highlightAtom,
  rankingAtom,
  toggleAtom,
  votingAtom,
} from "@/features/motw-vote/atoms"
import { cn } from "@/lib/utils"
import { mono, voteLabel } from "./motw-vote-text"

const footerButton =
  "flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
const emptyText = "px-4 py-6 text-sm text-muted-foreground lg:px-5"

export function Suggestions() {
  const ranking = useAtomValue(rankingAtom)
  const refresh = useAtomRefresh(rankingAtom)
  const count = useAtomValue(countAtom)
  const setCount = useAtomSet(countAtom)
  const highlight = useAtomValue(highlightAtom)
  const voting = useAtomValue(votingAtom)
  const toggle = useAtomSet(toggleAtom)

  const rows = AsyncResult.isSuccess(ranking) ? ranking.value.rows : []
  const failed = AsyncResult.isFailure(ranking) && !ranking.waiting
  const total = rows.length
  const shown = Math.min(total, count)
  const smFill = shown % 2
  const lgFill = (4 - (shown % 4)) % 4
  const fillers = Array.from({ length: Math.max(smFill, lgFill) }, (_, n) => n)

  return (
    <div className="mt-12 border border-border">
      {failed ? (
        <button
          type="button"
          onClick={refresh}
          className={cn(footerButton, "w-full")}
        >
          Try again
        </button>
      ) : !AsyncResult.isSuccess(ranking) ? (
        <p className={emptyText}>Loading suggestions…</p>
      ) : total === 0 ? (
        <p className={emptyText}>
          No suggestions yet. Search for a module above and be the first to +1
          it.
        </p>
      ) : (
        <ol className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {rows.slice(0, count).map((row, i) => (
            <li
              key={row.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 transition-colors duration-700 lg:px-5",
                highlight === row.id ? "bg-muted" : "bg-background",
              )}
            >
              <span className="w-6 shrink-0 font-mono text-xs font-medium text-subtle-foreground tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  {row.name}
                </span>
                <span className={cn("truncate", mono)}>{row.pkg}</span>
              </span>
              <button
                type="button"
                onClick={() => toggle(row)}
                disabled={voting}
                aria-pressed={row.voted}
                aria-label={`${row.voted ? "Remove your +1 from" : "+1"} ${row.name}, ${voteLabel(row.votes)}`}
                className={cn(
                  "inline-flex min-w-14 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  row.voted
                    ? "border-foreground bg-foreground text-background"
                    : "border-border-strong text-muted-foreground enabled:hover:border-muted-foreground enabled:hover:text-foreground",
                )}
              >
                <ArrowUp className="size-3" aria-hidden="true" />
                {row.votes}
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
              className={footerButton}
            >
              Show more
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </button>
          )}
          {count > STEP && (
            <button
              type="button"
              onClick={() => setCount(STEP)}
              className={cn(
                footerButton,
                "border-l border-border first:border-l-0",
              )}
            >
              Show fewer
              <ChevronDown className="size-3.5 rotate-180" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
