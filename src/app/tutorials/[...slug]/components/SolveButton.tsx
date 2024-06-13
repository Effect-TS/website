import React from "react"
import { useRx } from "@effect-rx/rx-react"
import { Button } from "@/components/ui/button"
import { useWorkspaceHandle } from "@/workspaces/context"

export function SolveButton() {
  const handle = useWorkspaceHandle()
  const [solved, setSolved] = useRx(handle.solved)

  return (
    <Button
      variant="secondary"
      onClick={() => setSolved((solved) => !solved)}
      // TODO
      // className="bg-neutral-700 disabled:bg-neutral-500 dark:bg-neutral-200 text-white dark:text-neutral-800 dark:disabled:bg-neutral-400 font-display text-lg leading-none py-4"
    >
      {solved ? "Reset" : "Show Solution"}
    </Button>
  )
}
