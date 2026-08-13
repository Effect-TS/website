import { useAtomSet } from "@effect/atom-react"
import { useState } from "react"
import { resetAtom } from "../atoms/import"
import { useWorkspaceHandle } from "../context/workspace"
import { ConfirmDialog } from "./confirm-dialog"

export function ResetButton() {
  const handle = useWorkspaceHandle()
  const reset = useAtomSet(resetAtom)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="h-7.5 cursor-pointer rounded-md border border-zinc-300 bg-zinc-50 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white"
        onClick={() => setConfirmOpen(true)}
      >
        Reset
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Reset playground?"
        description="This will discard your current code and restore the default example. This action can't be undone."
        confirmLabel="Reset"
        onConfirm={() => reset(handle)}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  )
}
