import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import "@xterm/xterm/css/xterm.css"
import React, { useEffect, useMemo, useRef } from "react"
import { useWorkspaceHandle } from "../context/WorkspaceContext"
import "./Terminal.css"
import { WorkspaceShell } from "@/domain/Workspace"

export function Terminal({ shell }: { readonly shell: WorkspaceShell }) {
  const workspace = useWorkspaceHandle()
  const rx = useMemo(() => workspace.terminal(shell), [workspace, shell])
  const terminal = useRxSuspenseSuccess(rx).value
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    terminal.open(ref.current!)
  }, [terminal])

  return (
    <div className="relative z-0 h-full">
      {shell.label && (
        <div className="bg-neutral-600 text-white leading-none px-2 py-1 font-display text-sm absolute top-2 right-5 z-10 rounded-full">
          {shell.label}
        </div>
      )}
      <div ref={ref} id="terminal" className="h-full bg-black" />
    </div>
  )
}
