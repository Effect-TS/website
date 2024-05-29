import React from "react"
import { WorkspaceHandle } from "./rx"
import { useRxRef, useRxRefProp } from "@effect-rx/rx-react"

export const WorkspaceContext = React.createContext<WorkspaceHandle>(
  null as any
)

export const useWorkspaceHandle = () => {
  return React.useContext(WorkspaceContext)
}

export const useWorkspace = () => useRxRef(useWorkspaceHandle().workspace)

export const useWorkspaceShellsRef = () =>
  useRxRefProp(useWorkspaceHandle().workspace, "shells")

export const useWorkspaceShells = () => useRxRef(useWorkspaceShellsRef())

export const useWorkspaceTreeRef = () =>
  useRxRefProp(useWorkspaceHandle().workspace, "tree")

export const useWorkspaceTree = () => useRxRef(useWorkspaceTreeRef())
