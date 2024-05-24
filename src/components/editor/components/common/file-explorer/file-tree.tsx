import React from "react"
import { Directory, File } from "@/workspaces/domain/workspace"
import { DirectoryNode } from "./directory-node"
import { FileNode } from "./file-node"

export declare namespace FileTree {
  export interface Props {
    readonly tree: ReadonlyArray<Directory | File>
    readonly depth?: number
    readonly onClick?: FileTree.OnClick
  }

  export interface OnClick {
    (event: React.MouseEvent<HTMLButtonElement>, node: File | Directory): void
  }
}

export const FileTree: React.FC<FileTree.Props> = ({
  tree,
  depth = 0,
  onClick
}) => {
  const files = tree.filter((node): node is File => node._tag === "File")
  const directories = tree.filter(
    (node): node is Directory => node._tag === "Directory"
  )

  return (
    <div>
      {directories.map((node) => (
        <DirectoryNode
          key={node.name}
          node={node}
          depth={depth}
          onClick={onClick}
        />
      ))}
      {files.map((node) => (
        <FileNode
          key={node.name}
          type="file"
          node={node}
          depth={depth}
          onClick={onClick}
        />
      ))}
    </div>
  )
}

FileTree.displayName = "FileTree"
