import React, { useCallback, useState } from "react"
import { Icon } from "@/components/icons"
import { Input } from "@/components/ui/input"
import type { Directory } from "@/workspaces/domain/workspace"
import { FileNode } from "./file-node"
import { FileTree } from "./file-tree"

export declare namespace DirectoryNode {
  export interface Props {
    readonly node: Directory
    readonly depth: number
  }

  export interface OnCreateFile {
    (event: React.MouseEventHandler<HTMLButtonElement>): void
  }

  export interface OnCreateDirectory {
    (event: React.MouseEventHandler<HTMLButtonElement>): void
  }
}

export const DirectoryNode: React.FC<DirectoryNode.Props> = ({
  depth,
  node,
}) => {

  const [open, setOpen] = useState(true)

  const handleToggle = useCallback(() => setOpen((prev) => !prev), [])

  const paddingLeft = 16 + depth + 1 * 8
  const styles = { paddingLeft: `${paddingLeft}px` }

  return (
    <>
      <FileNode
        type="directory"
        node={node}
        depth={depth}
        isOpen={open}
        onClick={handleToggle}
      />
      {open && (
        <React.Fragment>
          <div style={styles} className="flex items-center py-1">
            <span className="flex items-center h-4 w-4 mr-1">
              <Icon name="file" />
            </span>
            <Input className="h-6 p-0 mr-1 rounded-none" />
          </div>
          <FileTree
            tree={node.children}
            depth={depth + 1}
          />
        </React.Fragment>
      )}
    </>
  )
}

DirectoryNode.displayName = "DirectoryNode"
