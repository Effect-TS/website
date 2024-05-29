import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef
} from "react"
import { Icon } from "@/components/icons"
import {
  useRxRef,
  useRxRefProp,
  useRxSuspenseSuccess
} from "@effect-rx/rx-react"

import "@xterm/xterm/css/xterm.css"
import "./terminal.css"
import { WorkspaceShell } from "@/workspaces/domain/workspace"
import { useWorkspaceHandle } from "@/workspaces/context"

export function Terminal({ shell }: { readonly shell: WorkspaceShell }) {
  return (
    <div className="relative z-0 h-full flex flex-col">
      <div className="font-mono font-bold text-xs border-y border-neutral-300 dark:border-neutral-700 flex px-2 items-center">
        <Icon name="display" className="h-3 pr-2" />
        <span className="py-1">
          Terminal
          {shell.label && (
            <>
              {" "}
              &mdash;{" "}
              <span className="bg-neutral-600 px-2 py-0.5 text-white rounded-full">
                {shell.label}
              </span>
            </>
          )}
        </span>
        {/*<div className="flex-1" />
        <AddRemoveButton shell={shell} />*/}
      </div>
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
  const handle = useWorkspaceHandle()
  const shells = useRxRef(useRxRefProp(handle.workspace, "shells"))

  const addShell = useCallback(() => {
    handle.workspace.update((_) => _.addShell(new WorkspaceShell({})))
  }, [handle.workspace])

  const removeShell = useCallback(() => {
    handle.workspace.update((_) => _.removeShell(shell))
  }, [handle.workspace, shell])

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
