import { useAtom } from "@effect/atom-react"
import * as Cause from "effect/Cause"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import { CheckIcon, CopyIcon, Loader2Icon, Share2Icon } from "lucide-react"
import * as React from "react"
import { useScratchpadSession } from "./context.tsx"
import { shareErrorMessage } from "./share.ts"
import type { ScratchpadShareResult } from "./share-atoms.ts"

/**
 * Shares the Scratchpad: stores the Workspace with the shortener, copies the
 * `/scratchpad#<hash>` link and shows it in a popover (with the error when
 * sharing fails).
 */
export function ShareButton() {
  const { shareAtom } = useScratchpadSession()
  const [result, share] = useAtom(shareAtom)
  const [open, setOpen] = React.useState(false)
  const popoverRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const waiting = result.waiting
  const onClick = () => {
    if (waiting) return
    setOpen(true)
    share()
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        data-testid="scratchpad-share"
        onClick={onClick}
        disabled={waiting}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-6 cursor-pointer items-center gap-1.5 rounded border border-zinc-300 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {waiting ? (
          <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Share2Icon className="h-3.5 w-3.5" />
        )}
        Share
      </button>
      {open && !AsyncResult.isInitial(result) && (
        <SharePopover result={result} />
      )}
    </div>
  )
}

function SharePopover({
  result,
}: {
  readonly result: AsyncResult.AsyncResult<ScratchpadShareResult, unknown>
}) {
  const [copiedAgain, setCopiedAgain] = React.useState(false)

  React.useEffect(() => {
    if (!copiedAgain) return
    const timeout = setTimeout(() => setCopiedAgain(false), 2000)
    return () => clearTimeout(timeout)
  }, [copiedAgain])

  if (AsyncResult.isFailure(result)) {
    const message = shareErrorMessage(Cause.squash(result.cause))
    return (
      <PopoverFrame>
        <p
          role="alert"
          data-testid="scratchpad-share-error"
          className="text-xs text-red-700 dark:text-red-300"
        >
          {message}
        </p>
      </PopoverFrame>
    )
  }

  if (!AsyncResult.isSuccess(result)) {
    return (
      <PopoverFrame>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Creating a share link…
        </p>
      </PopoverFrame>
    )
  }

  const { url, copied } = result.value
  const copy = () => {
    navigator.clipboard.writeText(url).then(
      () => setCopiedAgain(true),
      () => setCopiedAgain(false),
    )
  }

  return (
    <PopoverFrame>
      <p
        data-testid="scratchpad-share-status"
        className="mb-2 text-xs text-zinc-600 dark:text-zinc-400"
      >
        {copied
          ? "Link copied to the clipboard. It opens here and in the Playground."
          : "Copy the link below. It opens here and in the Playground."}
      </p>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          readOnly
          aria-label="Share link"
          data-testid="scratchpad-share-url"
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="h-7 min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 font-mono text-xs text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <button
          type="button"
          aria-label="Copy share link"
          onClick={copy}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {copiedAgain ? (
            <CheckIcon className="h-3.5 w-3.5" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </PopoverFrame>
  )
}

function PopoverFrame({ children }: { readonly children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-label="Share"
      data-testid="scratchpad-share-popover"
      className="absolute top-full right-0 z-50 mt-1.5 w-[360px] max-w-[calc(100vw-2rem)] rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
    >
      {children}
    </div>
  )
}
