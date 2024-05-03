import React, { useEffect, useRef } from "react"
import { useRxValue, Result } from "@effect-rx/rx-react"
import { Workspace } from "@/services/WebContainer"
import { workspaceRx } from "../rx/workspace"

declare namespace Terminal {
  export interface Props {
    readonly workspace: Workspace
  }
}

export const Terminal: React.FC<Terminal.Props> = ({ workspace }) => {
  const terminal = useRxValue(workspaceRx(workspace).terminal)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (Result.isSuccess(terminal)) {
      terminal.value.open(ref.current!)
    }
  }, [terminal])

  return <div ref={ref} id="terminal" className="flex-grow" />
}