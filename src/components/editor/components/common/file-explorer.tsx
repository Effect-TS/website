import React, { createContext, useCallback, useContext } from "react"
import type { Directory, File } from "@/workspaces/domain/workspace"
import { useRx, useRxRefPropValue, useRxSet } from "@effect-rx/rx-react"
import { FileTree } from "./file-explorer/file-tree"
import { useWorkspaceHandle } from "@/workspaces/context"

export declare namespace FileExplorer {
  export interface Props {}

  export interface OnClick {
    (event: React.MouseEvent<HTMLButtonElement>, node: File | Directory): void
  }

  export interface Context {
    readonly selectedFile: File
    readonly setSelectedFile: (file: File) => void
  }
}

export const FileExplorerContext = createContext<FileExplorer.Context>(
  null as any
)

export function useFileExplorer() {
  return useContext(FileExplorerContext)
}

export const FileExplorer: React.FC<FileExplorer.Props> = () => {
  const handle = useWorkspaceHandle()
  const tree = useRxRefPropValue(handle.workspace, "tree")
  const [selectedFile, setSelectedFile] = useRx(handle.selectedFile)

  return (
    <FileExplorerContext.Provider
      value={{
        selectedFile,
        setSelectedFile
      }}
    >
      <aside className="min-h-full w-full overflow-auto">
        <FileTree tree={tree} />
      </aside>
    </FileExplorerContext.Provider>
  )
}

FileExplorer.displayName = "FileExplorer"
