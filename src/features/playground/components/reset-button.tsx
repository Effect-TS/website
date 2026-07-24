import { useAtomSet } from "@effect/atom-react"
import { useEffect, useState } from "react"
import { resetAtom } from "../atoms/import"
import { useWorkspaceHandle } from "../context/workspace"

export function ResetButton() {
  const handle = useWorkspaceHandle()
  const reset = useAtomSet(resetAtom)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!confirmOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [confirmOpen])

  return (
    <>
      <button
        type="button"
        className="cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
        onClick={() => setConfirmOpen(true)}
      >
        Reset
      </button>
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          aria-describedby="reset-dialog-description"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => setConfirmOpen(false)}
            className="absolute inset-0 animate-[fadeIn_0.2s_ease-out] bg-black/25 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md animate-[dialogIn_0.25s_ease-out] rounded-md border border-zinc-300 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <h2
              id="reset-dialog-title"
              className="text-lg font-semibold text-zinc-900 dark:text-white"
            >
              Reset playground?
            </h2>
            <p
              id="reset-dialog-description"
              className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
            >
              This will discard your current code and restore the default example. This action can't
              be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
                onClick={() => setConfirmOpen(false)}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                onClick={() => {
                  reset(handle)
                  setConfirmOpen(false)
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
