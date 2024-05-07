import React from "react"
import { WorkspaceHandle } from "../rx/workspace"

export const WorkspaceContext = React.createContext<WorkspaceHandle>(
  null as any
)

export const useWorkspace = () => {
  return React.useContext(WorkspaceContext)
}

export const useFiles = () => {
  return useWorkspace().workspace.filesOfInterest
}
