import { useAtomSet, useAtomMount } from "@effect/atom-react"
import * as Option from "effect/Option"
import { useCallback, useMemo } from "react"
import { useWorkspaceHandle } from "../context/workspace"
import { WorkspaceTerminal, type WorkspaceShell } from "../domain/workspace"

import "@xterm/xterm/css/xterm.css"
import "./terminal.css"

export function Terminal({ shell }: { readonly shell: WorkspaceShell }) {
  return (
    <div className="relative z-0 flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <Shell shell={shell} />
      </div>
    </div>
  )
}

function Shell({ shell }: { readonly shell: WorkspaceShell }) {
  const handle = useWorkspaceHandle()
  const { element, terminal } = useMemo(
    () => handle.createTerminal(new WorkspaceTerminal({ command: shell.command })),
    [handle, shell.command],
  )
  useAtomMount(terminal)

  const setElement = useAtomSet(element)
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) setElement(Option.some(node))
    },
    [setElement],
  )

  return <div ref={containerRef} id="terminal" className="h-full" />
}
