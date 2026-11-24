import { useAtom } from "@effect/atom-react"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import { DownloadIcon, Loader2Icon } from "lucide-react"
import { useScratchpadSession } from "./context.tsx"

/**
 * The Share popover's last row, as on `/play`: saves the Workspace as a zip
 * named after it (the files a Share holds). It works whether or not the share
 * link could be made.
 */
export function DownloadRow() {
  const { downloadAtom } = useScratchpadSession()
  const [result, download] = useAtom(downloadAtom)
  const waiting = result.waiting
  const failed = AsyncResult.isFailure(result)

  return (
    <div className="mt-3 flex items-center gap-1.5 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <p
        className="flex-1 text-xs text-zinc-600 data-[failed=true]:text-red-700 dark:text-zinc-400 dark:data-[failed=true]:text-red-300"
        data-failed={failed}
        role={failed ? "alert" : undefined}
      >
        {failed
          ? "Couldn't create the zip. Try again."
          : "Or download the files as a zip"}
      </p>
      <button
        type="button"
        data-testid="scratchpad-download"
        onClick={() => {
          if (!waiting) download()
        }}
        disabled={waiting}
        aria-label="Download as zip"
        title="Download as zip"
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-70 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {waiting ? (
          <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <DownloadIcon className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}
