import React, { createContext, useCallback, useContext } from "react"
import type { Directory, File } from "@/workspaces/domain/workspace"
import { useRx, useRxRefPropValue, useRxSet } from "@effect-rx/rx-react"
import { FileTree } from "./file-explorer/file-tree"
import { useWorkspaceHandle } from "@/workspaces/context"

export function FileExplorer() {
  const handle = useWorkspaceHandle()
  const tree = useRxRefPropValue(handle.workspace, "tree")

  return (
    <aside className="min-h-full w-full overflow-auto">
      <FileTree tree={tree} />
    </aside>
  )
}
