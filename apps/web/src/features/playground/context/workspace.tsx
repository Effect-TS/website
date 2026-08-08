import { useAtomMount, useAtomSuspense, useAtomValue } from "@effect/atom-react"
import React from "react"
import { autoSaveAtom } from "../atoms/import"
import {
  workspaceHandleAtom,
  type AtomWorkspaceHandle,
} from "../atoms/workspace"
import { Workspace } from "../domain/workspace"

export const WorkspaceContext = React.createContext<AtomWorkspaceHandle>(
  null as any,
)

export const useWorkspaceHandle = () => React.useContext(WorkspaceContext)
export const useWorkspaceAtom = () => useWorkspaceHandle().workspaceAtom
export const useWorkspaceShells = () =>
  useAtomValue(useWorkspaceAtom(), (workspace) => workspace.shells)
export const useWorkspaceTree = () =>
  useAtomValue(useWorkspaceAtom(), (workspace) => workspace.tree)

export function WorkspaceProvider({
  children,
  workspace,
}: React.PropsWithChildren<{
  readonly workspace: Workspace
}>) {
  const handle = useAtomSuspense(workspaceHandleAtom(workspace)).value
  useAtomMount(autoSaveAtom(handle))
  return (
    <WorkspaceContext.Provider value={handle}>
      {children}
    </WorkspaceContext.Provider>
  )
}
