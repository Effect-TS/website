import { useAtomSet } from "@effect/atom-react"
import { useState } from "react"
import { resetAtom } from "../atoms/import"
import { useWorkspaceHandle } from "../context/workspace"
import { ConfirmDialog } from "./confirm-dialog"
import { ToolbarButton } from "./toolbar-button"

export function ResetButton() {
  const handle = useWorkspaceHandle()
  const reset = useAtomSet(resetAtom)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <ToolbarButton onClick={() => setConfirmOpen(true)}>Reset</ToolbarButton>
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
