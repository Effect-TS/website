import { useRx } from "@effect-rx/rx-react"
import { useWorkspace } from "../context/WorkspaceContext"

export function SolveButton() {
  const [solved, setSolved] = useRx(useWorkspace().solved)
  return (
    <button
      type="button"
      onClick={() => setSolved(true)}
      disabled={solved}
      className="bg-neutral-700 disabled:bg-neutral-500 dark:bg-neutral-200 text-white dark:text-neutral-800 dark:disabled:bg-neutral-400 font-display text-lg leading-none py-4"
    >
      {solved ? "Solved!" : "Solve"}
    </button>
  )
}
