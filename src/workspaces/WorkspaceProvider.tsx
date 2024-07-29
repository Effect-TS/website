import React, { ReactNode } from "react"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { WorkspaceContext } from "./context/workspace"
import { Workspace } from "./domain/workspace"
import { workspaceHandleRx } from "./rx/workspace"

export function WorkspaceProvider({
  workspace,
  children
}: {
  readonly workspace: Workspace
  readonly children: ReactNode
}) {
  const handle = useRxSuspenseSuccess(workspaceHandleRx(workspace)).value
  return (
    <WorkspaceContext.Provider value={handle}>
      {children}
    </WorkspaceContext.Provider>
  )
}
