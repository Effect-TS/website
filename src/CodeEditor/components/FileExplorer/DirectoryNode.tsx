import type { Directory, File } from "@/domain/Workspace"
import React, { useCallback, useState } from "react"
import { FileNode } from "./FileNode"
import { FileTree } from "./FileTree"

export declare namespace DirectoryNode {
  export interface OnClick {
    (event: React.MouseEvent<HTMLButtonElement>, node: File | Directory): void
  }
}

export function DirectoryNode({
  node,
  depth,
  onClick
}: {
  readonly node: Directory
  readonly depth: number
  readonly onClick?: DirectoryNode.OnClick
}) {
  const [open, setOpen] = useState(true)

  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  return (
    <div>
      <FileNode
        type="directory"
        node={node}
        depth={depth}
        isOpen={open}
        onClick={toggle}
      />
      {open && (
        <FileTree tree={node.children} depth={depth + 1} onClick={onClick} />
      )}
    </div>
  )
}

DirectoryNode.displayName = "DirectoryNode"
