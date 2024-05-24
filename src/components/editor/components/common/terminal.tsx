import React, { useEffect, useMemo, useRef } from "react"
import { Icon } from "@/components/icons"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"

import "@xterm/xterm/css/xterm.css"
import "./terminal.css"
import { WorkspaceShell } from "@/workspaces/domain/workspace"
import { useWorkspaceHandle } from "@/workspaces/context"

export function Terminal({ shell }: { readonly shell: WorkspaceShell }) {
  const workspace = useWorkspaceHandle()
  const rx = useMemo(() => workspace.terminal(shell), [workspace, shell])
  const terminal = useRxSuspenseSuccess(rx).value
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    terminal.open(ref.current!)
  }, [terminal])

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
      </div>
      <div className="flex-1 overflow-hidden">
        <div ref={ref} id="terminal" className="h-full" />
      </div>
    </div>
  )
}
