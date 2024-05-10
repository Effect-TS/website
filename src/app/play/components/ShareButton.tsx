import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import { useCallback, useMemo } from "react"
import { shareRx } from "../rx/share"
import { useWorkspaceHandle } from "@/CodeEditor/context/WorkspaceContext"

export function ShareButton() {
  const handle = useWorkspaceHandle()
  const rx = useMemo(() => shareRx(handle), [handle])
  const state = useRxValue(rx.state)
  const share = useRxSet(rx.share)
  const onClick = useCallback(() => {
    share()
  }, [share])
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
