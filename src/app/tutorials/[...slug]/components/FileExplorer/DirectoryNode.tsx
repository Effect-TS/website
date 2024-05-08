import { Directory, File } from "@/domain/Workspace"
import React, { useCallback, useState } from "react"
import { FileNode } from "./FileNode"
import { FileTree } from "./FileTree"

export declare namespace DirectoryNode {
  export interface Props {
    readonly nodes: ReadonlyArray<Directory | File>
    readonly prefix: string
    readonly depth: number
  }
}

export const DirectoryNode: React.FC<DirectoryNode.Props> = ({
  nodes,
  prefix,
  depth
}) => {
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  const pathPrefix = prefix + "/"

  return (
    <div>
      <FileNode
        type="directory"
        path={pathPrefix}
        depth={depth}
        isOpen={open}
        onClick={toggle}
      />
      {open && (
        <FileTree
          tree={nodes}
          prefix={pathPrefix}
          depth={depth + 1}
        />
      )}
    </div>
  )
}

DirectoryNode.displayName = "DirectoryNode"
