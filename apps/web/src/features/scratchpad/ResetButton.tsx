import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { RotateCcwIcon } from "lucide-react"
import * as React from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useScratchpadSession } from "./context.tsx"

/**
 * Resets the Scratchpad to the current version's seed, after asking: clears
 * the autosave and the share link in the URL.
 */
export function ResetButton() {
  const { effectVersionAtom, resetAtom } = useScratchpadSession()
  const version = useAtomValue(effectVersionAtom)
  const reset = useAtomSet(resetAtom)
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <button
        type="button"
        data-testid="scratchpad-reset"
        onClick={() => setOpen(true)}
        className="flex h-6 cursor-pointer items-center gap-1.5 rounded border border-zinc-300 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <RotateCcwIcon className="h-3.5 w-3.5" />
        Reset
      </button>
      <ConfirmDialog
        open={open}
        title="Reset the Scratchpad?"
        description="This discards your code and restores the starter files. It can't be undone."
        confirmLabel="Reset"
        onConfirm={() => reset(version)}
        onOpenChange={setOpen}
      />
    </>
  )
}
