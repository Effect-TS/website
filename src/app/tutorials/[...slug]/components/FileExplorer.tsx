import React, { useCallback } from "react"
import { useRxSet } from "@effect-rx/rx-react"
import { FileTree } from "./FileExplorer/FileTree"
import { useWorkspace } from "../context/WorkspaceContext"
import type { Directory, File } from "@/domain/Workspace"

export declare namespace FileExplorer {
  export interface Props {}

  export interface OnClick {
    (event: React.MouseEvent<HTMLButtonElement>, node: File | Directory): void
  }
}

export const FileExplorer: React.FC<FileExplorer.Props> = () => {
  const { selectedFile, workspace } = useWorkspace()
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
    <aside className="min-h-full sm:max-w-xs p-2 px-4 overflow-auto">
      <FileTree tree={workspace.tree} onClick={handleClick} />
    </aside>
  )
}

FileExplorer.displayName = "FileExplorer"
