import * as Option from "effect/Option"
import { ExternalLink, X } from "lucide-react"
import * as React from "react"
import type { LoadNotice } from "./load.ts"

/**
 * Shown when the Workspace the visitor asked for (a Share, a `?code=` link or
 * an autosave) can't open in the Scratchpad. The seed loads underneath.
 */
export function LoadNoticeBar({
  notice,
}: {
  readonly notice: Option.Option<LoadNotice>
}) {
  const [dismissed, setDismissed] = React.useState(false)
  if (dismissed || Option.isNone(notice)) {
    return null
  }
  return (
    <div
      role="status"
      data-testid="scratchpad-load-notice"
      data-reason={notice.value.reason}
      className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <span>
        {notice.value.message} You're seeing a new Scratchpad instead.
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <a
          href={notice.value.playgroundUrl}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium underline-offset-2 hover:bg-amber-200/60 hover:underline dark:hover:bg-amber-900/50"
        >
          Open in Playground
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          type="button"
          aria-label="Dismiss notice"
          onClick={() => setDismissed(true)}
          className="rounded p-0.5 hover:bg-amber-200/60 dark:hover:bg-amber-900/50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  )
}
