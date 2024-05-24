import React, { ReactNode } from "react"
import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import { Workspace } from "./domain/workspace"
import { workspaceHandleRx } from "./rx"
import { WorkspaceContext } from "./context"

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
