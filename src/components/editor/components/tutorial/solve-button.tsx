import React from "react"
import { useRx } from "@effect-rx/rx-react"
import { useWorkspaceHandle } from "@/workspaces/context/workspace"
import { Button } from "@/components/ui/button"

export declare namespace SolveButton {
  export interface Props {}
}

export const SolveButton: React.FC<SolveButton.Props> = () => {
  const [solved, setSolved] = useRx(useWorkspaceHandle().solved)

  return (
    <Button
      variant="secondary"
      onClick={() => setSolved((solved) => !solved)}
      // TODO
      // className="bg-neutral-700 disabled:bg-neutral-500 dark:bg-neutral-200 text-white dark:text-neutral-800 dark:disabled:bg-neutral-400 font-display text-lg leading-none py-4"
    >
      {solved ? "Reset" : "Solve"}
    </Button>
  )
}

SolveButton.displayName = "SolveButton"
