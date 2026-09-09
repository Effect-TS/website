import { useAtomSet } from "@effect/atom-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { resetAtom } from "../atoms/import"
import { useWorkspaceHandle } from "../context/workspace"
import { ConfirmDialog } from "./confirm-dialog"

export function ResetButton() {
  const handle = useWorkspaceHandle()
  const reset = useAtomSet(resetAtom)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <Button
        variant="subtle"
        className="h-7.5 rounded-md px-3 text-xs"
        onClick={() => setConfirmOpen(true)}
      >
        Reset
      </Button>
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
