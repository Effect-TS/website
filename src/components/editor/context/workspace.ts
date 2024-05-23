import React, { useMemo } from "react"
import { WorkspaceHandle } from "../rx/workspace"
import { shareRx } from "../rx/share"

export const WorkspaceContext = React.createContext<WorkspaceHandle>(
  null as any
)

export const useWorkspaceHandle = () => {
  return React.useContext(WorkspaceContext)
}

export const useWorkspace = () => useWorkspaceHandle().workspace

export const useShareRx = () => {
  const handle = useWorkspaceHandle()
  return useMemo(() => shareRx(handle), [handle])
}
