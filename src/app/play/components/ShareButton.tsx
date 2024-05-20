import { useWorkspaceHandle } from "@/CodeEditor/context/WorkspaceContext"
import { useRxSetPromise, useRxValue } from "@effect-rx/rx-react"
import { useCallback, useMemo } from "react"
import { shareRx } from "../rx/share"
import { Cause } from "effect"

export function ShareButton() {
  const handle = useWorkspaceHandle()
  const rx = useMemo(() => shareRx(handle), [handle])
  const state = useRxValue(rx.state)
  const share = useRxSetPromise(rx.share)
  const onClick = useCallback(() => {
    const item = new ClipboardItem({
      "text/plain": share().then((exit) => {
        if (exit._tag === "Success") {
          return new Blob([exit.value], { type: "text/plain" })
        }
        throw Cause.prettyErrors(exit.cause)[0]
      })
    })
    navigator.clipboard.write([item])
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
