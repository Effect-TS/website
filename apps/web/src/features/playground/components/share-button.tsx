import { useAtomSet, useAtomValue, useAtom } from "@effect/atom-react"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import { CheckIcon, CopyIcon, DownloadIcon, Loader2Icon } from "lucide-react"
import { useCallback, useState, useRef, useEffect } from "react"
import { copyLinkAtom, downloadAtom, shareAtom } from "../atoms/share"
import { useWorkspaceHandle } from "../context/workspace"

export function ShareButton() {
  const handle = useWorkspaceHandle()
  const share = useAtomSet(shareAtom(handle))
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const onToggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) share()
      return !prev
    })
  }, [share])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={onToggle}
        className="cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
      >
        Share
      </button>
      {open && <ShareContent />}
    </div>
  )
}

function ShareContent() {
  const handle = useWorkspaceHandle()
  const result = useAtomValue(shareAtom(handle))
  const [copied, setCopied] = useAtom(copyLinkAtom)
  const [downloaded, download] = useAtom(downloadAtom)

  const url = AsyncResult.isSuccess(result) ? result.value.url : ""
  const isWaiting = result.waiting
  const isFailed = AsyncResult.isFailure(result)

  return (
    <div className="absolute top-full right-0 z-50 mt-2 w-[400px] animate-[dialogIn_0.25s_ease-out] rounded-lg border border-zinc-300 bg-zinc-100 p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Share
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Use the link to share this playground with others.
        </p>
      </div>
      <div className="flex items-center space-x-2 pt-4">
        <div className="flex-1">
          <input
            type="text"
            readOnly
            placeholder="Loading..."
            value={isFailed ? "An error occurred." : url}
            className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />
        </div>
        <button
          type="button"
          className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          disabled={isWaiting || isFailed}
          onClick={() => setCopied(handle)}
        >
          {AsyncResult.isSuccess(copied) ? (
            <CheckIcon size={16} />
          ) : isWaiting ? (
            <Loader2Icon className="animate-spin" size={16} />
          ) : (
            <CopyIcon size={16} />
          )}
        </button>
      </div>
      <div className="flex items-center space-x-2 pt-4">
        <p className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">
          Or download the files locally
        </p>
        <button
          type="button"
          className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          disabled={isWaiting || isFailed}
          onClick={() => download(handle)}
        >
          {AsyncResult.isSuccess(downloaded) ? (
            <CheckIcon size={16} />
          ) : isWaiting ? (
            <Loader2Icon className="animate-spin" size={16} />
          ) : (
            <DownloadIcon size={16} />
          )}
        </button>
      </div>
    </div>
  )
}
