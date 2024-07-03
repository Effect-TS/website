import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef
} from "react"
import { Icon } from "@/components/icons"
import { useRxSet, useRxSuspenseSuccess } from "@effect-rx/rx-react"

import "@xterm/xterm/css/xterm.css"
import "./terminal.css"
import { WorkspaceShell } from "@/workspaces/domain/workspace"
import {
  useWorkspaceHandle,
  useWorkspaceRx,
  useWorkspaceShells
} from "@/workspaces/context/workspace"

export function Terminal({ shell }: { readonly shell: WorkspaceShell }) {
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

function Shell({ shell }: { readonly shell: WorkspaceShell }) {
  const ref = useRef<HTMLDivElement>(null)
  const handle = useWorkspaceHandle()
  const rx = useMemo(() => handle.terminal(shell), [handle, shell])
  const terminal = useRxSuspenseSuccess(rx).value

  useEffect(() => {
    terminal.open(ref.current!)
  }, [terminal])

  return <div ref={ref} id="terminal" className="h-full" />
}

function AddRemoveButton({ shell }: { readonly shell: WorkspaceShell }) {
  const workspace = useWorkspaceRx()
  const setWorkspace = useRxSet(workspace)
  const shells = useWorkspaceShells()

  const addShell = useCallback(() => {
    setWorkspace((workspace) => workspace.addShell(new WorkspaceShell({})))
  }, [setWorkspace])

  const removeShell = useCallback(() => {
    setWorkspace((workspace) => workspace.removeShell(shell))
  }, [shell, setWorkspace])

  if (shells[0] === shell) {
    if (shells.length > 1) return null
    return (
      <button type="button" onClick={addShell}>
        <Icon name="plus" className="h-4" />
      </button>
    )
  }

  return (
    <button type="button" onClick={removeShell}>
      <Icon name="close" className="h-4" />
    </button>
  )
}
