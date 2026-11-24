import { useAtom } from "@effect/atom-react"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import { DownloadIcon, Loader2Icon } from "lucide-react"
import { useScratchpadSession } from "./context.tsx"

/** Saves the Workspace as a zip named after it (the files a Share holds). */
export function DownloadButton() {
  const { downloadAtom } = useScratchpadSession()
  const [result, download] = useAtom(downloadAtom)
  const waiting = result.waiting
  const failed = AsyncResult.isFailure(result)
  const label = failed
    ? "Couldn't create the zip. Try again."
    : "Download as zip"

  return (
    <button
      type="button"
      data-testid="scratchpad-download"
      onClick={() => {
        if (!waiting) download()
      }}
      disabled={waiting}
      aria-label={label}
      title={label}
      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-70 data-[failed=true]:border-red-400 data-[failed=true]:text-red-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:data-[failed=true]:border-red-500 dark:data-[failed=true]:text-red-300"
      data-failed={failed}
    >
      {waiting ? (
        <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <DownloadIcon className="h-3.5 w-3.5" />
      )}
    </button>
  )
}
