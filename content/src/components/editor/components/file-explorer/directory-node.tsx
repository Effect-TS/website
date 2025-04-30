import { useCallback, useState } from "react"
import { Directory } from "../../domain/workspace"
import { useCreate, useExplorerState } from "../file-explorer"
import { FileNode } from "./file-node"
import { FileTree } from "./file-tree"
import { FileInput } from "./file-input"

export function DirectoryNode({
  depth,
  node,
  path
}: {
  readonly node: Directory
  readonly depth: number
  readonly path: string
}) {
  const [open, setOpen] = useState(true)
  const state = useExplorerState()
  const create = useCreate()
  const isCreating = state._tag === "Creating" && state.parent === node

  const handleToggle = useCallback(() => setOpen((prev) => !prev), [])

  return (
    <>
      <FileNode type="directory" node={node} depth={depth} path={path} isOpen={open} onClick={handleToggle} />
      {open && (
        <>
          {isCreating && state.type === "Directory" && (
            <FileInput type={state.type} depth={depth + 1} onSubmit={(name) => create(node, name, "Directory")} />
          )}
          <FileTree tree={node.children} depth={depth + 1} path={path} />
          {isCreating && state.type === "File" && (
            <FileInput type={state.type} depth={depth + 1} onSubmit={(name) => create(node, name, "File")} />
          )}
        </>
      )}
    </>
  )
}
