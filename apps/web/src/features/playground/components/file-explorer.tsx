import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as Data from "effect/Data"
import * as Atom from "effect/unstable/reactivity/Atom"
import { useCallback, useLayoutEffect, useRef } from "react"
import { ConfirmDialog } from "./confirm-dialog"
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
    Deleting: {
      node: Directory | File
      trigger: HTMLButtonElement
    }
  }>
}

export const State = Data.taggedEnum<FileExplorer.State>()
export const stateAtom = Atom.make<FileExplorer.State>(State.Idle())

export const useExplorerState = () => useAtomValue(stateAtom)
export const useExplorerDispatch = () => useAtomSet(stateAtom)
export const useCreate = () => {
  const handle = useWorkspaceHandle()
  const create = useAtomSet(handle.createFile)
  const dispatch = useExplorerDispatch()
  return useCallback(
    (parent: Directory, name: string, type: Workspace.FileType) => {
      create([name, type, { parent }])
      dispatch(State.Idle())
    },
    [create, dispatch],
  )
}
export const useRename = () => {
  const handle = useWorkspaceHandle()
  const rename = useAtomSet(handle.renameFile)
  const dispatch = useExplorerDispatch()
  return useCallback(
    (node: File | Directory, name: string) => {
      rename([node, name])
      dispatch(State.Idle())
    },
    [rename, dispatch],
  )
}
export const useRemove = () => {
  const handle = useWorkspaceHandle()
  const remove = useAtomSet(handle.removeFile)
  const dispatch = useExplorerDispatch()
  return useCallback(
    (node: File | Directory) => {
      remove(node)
      dispatch(State.Idle())
    },
    [remove, dispatch],
  )
}

export function FileExplorer() {
  const tree = useWorkspaceTree()
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const remove = useRemove()
  const root = useRef<HTMLElement>(null)
  const returnFocus = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    if (state._tag === "Deleting") returnFocus.current = state.trigger
  }, [state])
  return (
    <aside
      ref={root}
      data-file-explorer
      aria-label="Files"
      tabIndex={-1}
      className="min-h-full w-full overflow-auto bg-background px-3 py-3"
    >
      <FileTree tree={tree} />
      <ConfirmDialog
        open={state._tag === "Deleting"}
        title={
          state._tag === "Deleting"
            ? `Delete ${state.node.name}?`
            : "Delete file?"
        }
        description="This will remove it from the playground."
        confirmLabel="Delete"
        finalFocus={returnFocus}
        onClose={() => dispatch(State.Idle())}
        onConfirm={() => {
          if (state._tag === "Deleting") {
            returnFocus.current = root.current
            remove(state.node)
          }
        }}
      />
    </aside>
  )
}
