import React from "react"
import { FileTree } from "./FileExplorer/FileTree"
import { useWorkspace } from "../context/WorkspaceContext"

export declare namespace FileExplorer {
  export interface Props {}
}

export const FileExplorer: React.FC<FileExplorer.Props> = () => {
  const { workspace } = useWorkspace()
  return (
    <aside className="min-h-full sm:max-w-xs p-2 px-4 overflow-auto">
      <FileTree tree={workspace.tree} />
    </aside>
  )
}

FileExplorer.displayName = "FileExplorer"