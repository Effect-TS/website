import { useRef, useContext, useEffect } from "react"
import { RegistryContext } from "@effect-rx/rx-react"
import { useWorkspaceHandle } from "../context/workspace"
import { WorkspaceTerminal, type WorkspaceShell } from "../domain/workspace"

import "@xterm/xterm/css/xterm.css"
import "./terminal.css"

export function Terminal({ shell }: { readonly shell: WorkspaceShell }) {
  return (
    <div className="relative z-0 h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Shell shell={shell} />
      </div>
    </div>
  )
}

function Shell({ shell }: { readonly shell: WorkspaceShell }) {
  const handle = useWorkspaceHandle()
  const elRef = useRef<HTMLDivElement>(null)
  const registry = useContext(RegistryContext)

  useEffect(() => {
    if (!elRef.current) return
    return registry.mount(
      handle.createTerminal(
        new WorkspaceTerminal({
          command: shell.command,
          element: elRef.current
        })
      )
    )
  }, [elRef, handle, registry])

  return <div ref={elRef} id="terminal" className="h-full" />
}
