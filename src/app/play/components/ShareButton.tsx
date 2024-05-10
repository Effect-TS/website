import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import { useCallback } from "react"
import { shareRx, shareStateRx } from "../rx/share"
import { useWorkspace } from "@/CodeEditor/context/WorkspaceContext"

export function ShareButton() {
  const workspace = useWorkspace()
  const state = useRxValue(shareStateRx)
  const share = useRxSet(shareRx)
  const onClick = useCallback(
    function () {
      share(workspace)
    },
    [share, workspace]
  )
  return (
    <button
      type="button"
      disabled={state !== "idle"}
      onClick={onClick}
      className="bg-neutral-700 disabled:bg-neutral-500 dark:bg-neutral-200 text-white dark:text-neutral-800 dark:disabled:bg-neutral-400 font-display text-lg leading-none py-4 transition-all"
    >
      {state === "success" ? "Copied URL!" : "Share"}
    </button>
  )
}
