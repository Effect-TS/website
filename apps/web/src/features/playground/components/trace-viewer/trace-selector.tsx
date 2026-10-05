import { useAtom, useAtomValue } from "@effect/atom-react"
import { ChevronDownIcon, CheckIcon } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { selectedSpanIndexAtom, selectedSpanAtom } from "../../atoms/devtools"
import { rootSpansAtom } from "../../services/devtools"

export function TraceSelector() {
  const [open, setOpen] = useState(false)
  const rootSpans = useAtomValue(rootSpansAtom)
  const [span, setSelectedSpan] = useAtom(selectedSpanAtom)
  const selectedSpanIndex = useAtomValue(selectedSpanIndexAtom)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-72 cursor-pointer items-center justify-between rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:border-border-strong hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="truncate">{span?.traceId || "Select a trace..."}</span>
        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-60 w-72 overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
          {rootSpans.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              No traces found.
            </div>
          ) : (
            rootSpans.map((root, index) => (
              <button
                key={root.traceId}
                type="button"
                className={cn(
                  "flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground",
                  selectedSpanIndex === index && "bg-accent text-foreground",
                )}
                onClick={() => {
                  setSelectedSpan(index)
                  setOpen(false)
                }}
              >
                <span className="flex-1 truncate">{root.traceId}</span>
                <CheckIcon
                  className={cn(
                    "ml-2 h-4 w-4",
                    selectedSpanIndex === index ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
