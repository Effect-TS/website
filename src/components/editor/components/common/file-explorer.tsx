import React, { useCallback } from "react"
import type { Directory, File } from "@/workspaces/domain/workspace"
import { useRxRefPropValue, useRxSet } from "@effect-rx/rx-react"
import { FileTree } from "./file-explorer/file-tree"
import { useWorkspaceHandle } from "@/workspaces/context"

export declare namespace FileExplorer {
  export interface Props {}

  export interface OnClick {
    (event: React.MouseEvent<HTMLButtonElement>, node: File | Directory): void
  }
}

export const FileExplorer: React.FC<FileExplorer.Props> = () => {
  const { selectedFile, workspace } = useWorkspaceHandle()
  const tree = useRxRefPropValue(workspace, "tree")
  const setFile = useRxSet(selectedFile)

  const handleClick = useCallback<FileExplorer.OnClick>(
    (_event, node) => {
      if (node._tag === "File") {
        setFile(node)
      }
    },
    [setFile]
  )

  return (
    <aside className="min-h-full w-full py-2 overflow-auto">
      <FileTree tree={tree} onClick={handleClick} />
    </aside>
  )
}

FileExplorer.displayName = "FileExplorer"
