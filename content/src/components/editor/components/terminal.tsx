import { useCallback, useMemo, Suspense } from "react"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { useWorkspaceHandle } from "../context/workspace"
import type { WorkspaceShell } from "../domain/workspace"

import "@xterm/xterm/css/xterm.css"
import "./terminal.css"

export function Terminal({ shell }: {
  readonly shell: WorkspaceShell
}) {
  return (
    <div className="relative z-0 h-full flex flex-col">
      <Suspense fallback={null}>
        <div className="flex-1 overflow-hidden">
          <Shell shell={shell} />
        </div>
      </Suspense>
    </div>
  )
}

function Shell({ shell }: {
  readonly shell: WorkspaceShell
}) {
  const handle = useWorkspaceHandle()
  const rx = useMemo(() => handle.createTerminal(shell), [handle, shell])
  const terminal = useRxSuspenseSuccess(rx).value

  const terminalRef = useCallback((node: HTMLDivElement) => {
    terminal.open(node)
  }, [terminal])

  return <div ref={terminalRef} id="terminal" className="h-full" />
}
