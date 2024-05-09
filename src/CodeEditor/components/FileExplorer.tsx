import type { Directory, File } from "@/domain/Workspace"
import { useRxSet } from "@effect-rx/rx-react"
import React, { useCallback } from "react"
import { useWorkspace } from "../context/WorkspaceContext"
import { FileTree } from "./FileExplorer/FileTree"

export declare namespace FileExplorer {
  export interface OnClick {
    (event: React.MouseEvent<HTMLButtonElement>, node: File | Directory): void
  }
}

export function FileExplorer() {
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
    <aside className="min-h-full sm:max-w-xs py-2 overflow-auto">
      <FileTree tree={workspace.tree} onClick={handleClick} />
    </aside>
  )
}
