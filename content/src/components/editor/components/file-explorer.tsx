import { useCallback } from "react"
import { Rx, useRxSet, useRxValue } from "@effect-rx/rx-react"
import * as Data from "effect/Data"
import { useWorkspaceHandle, useWorkspaceTree } from "../context/workspace"
import { Directory, File, Workspace } from "../domain/workspace"
import { FileTree } from "./file-explorer/file-tree"

export declare namespace FileExplorer {
  export type State = Data.TaggedEnum<{
    Idle: {}
    Creating: {
      parent: Directory
      type: Workspace.FileType
    }
    Editing: {
      node: Directory | File
    }
  }>
}

export const State = Data.taggedEnum<FileExplorer.State>()
export const stateRx = Rx.make<FileExplorer.State>(State.Idle())

export const useExplorerState = () => useRxValue(stateRx)
export const useExplorerDispatch = () => useRxSet(stateRx)
export const useCreate = () => {
  const handle = useWorkspaceHandle()
  const create = useRxSet(handle.createFile)
  const dispatch = useExplorerDispatch()
  return useCallback(
    (parent: Directory, name: string, type: Workspace.FileType) => {
      create([name, type, { parent }])
      dispatch(State.Idle())
    },
    [create, dispatch]
  )
}
export const useRename = () => {
  const handle = useWorkspaceHandle()
  const rename = useRxSet(handle.renameFile)
  const dispatch = useExplorerDispatch()
  return useCallback(
    (node: File | Directory, name: string) => {
      rename([node, name])
      dispatch(State.Idle())
    },
    [rename, dispatch]
  )
}
export const useRemove = () => {
  const handle = useWorkspaceHandle()
  const remove = useRxSet(handle.removeFile)
  const dispatch = useExplorerDispatch()
  return useCallback(
    (node: File | Directory) => {
      remove(node)
      dispatch(State.Idle())
    },
    [remove, dispatch]
  )
}

export function FileExplorer() {
  const tree = useWorkspaceTree()
  return (
    <aside className="min-h-full w-full overflow-auto bg-[var(--sl-color-bg-sidebar)]">
      <FileTree tree={tree} />
    </aside>
  )
}
