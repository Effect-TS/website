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
  autoSave = true,
}: React.PropsWithChildren<{
  readonly workspace: Workspace
  readonly autoSave?: boolean
}>) {
  const handle = useAtomSuspense(workspaceHandleAtom(workspace)).value
  return (
    <WorkspaceContext.Provider value={handle}>
      {autoSave && <AutoSave handle={handle} />}
      {children}
    </WorkspaceContext.Provider>
  )
}

function AutoSave({ handle }: { readonly handle: AtomWorkspaceHandle }) {
  useAtomMount(autoSaveAtom(handle))
  return null
}
