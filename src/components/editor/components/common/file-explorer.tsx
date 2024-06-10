import React, { useCallback } from "react"
import { Data, Option } from "effect"
import { useWorkspaceHandle, useWorkspaceTree } from "@/workspaces/context"
import { FileTree } from "./file-explorer/file-tree"
import { File, Directory } from "@/workspaces/domain/workspace"
import { Rx, useRxSet, useRxValue } from "@effect-rx/rx-react"

export declare namespace FileExplorer {
  export type InputType = "File" | "Directory"

  export type State = Data.TaggedEnum<{
    Idle: {}
    Creating: {
      parent: Directory
      type: InputType
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
  const create = useRxSet(handle.create)
  const dispatch = useExplorerDispatch()
  return useCallback(
    (parent: Directory, name: string, type: FileExplorer.InputType) => {
      create([Option.some(parent), name, type])
      dispatch(State.Idle())
    },
    [create, dispatch]
  )
}
export const useRename = () => {
  const handle = useWorkspaceHandle()
  const rename = useRxSet(handle.rename)
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
  const remove = useRxSet(handle.remove)
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
    <aside className="min-h-full w-full overflow-auto">
      <FileTree tree={tree} />
    </aside>
  )
}
