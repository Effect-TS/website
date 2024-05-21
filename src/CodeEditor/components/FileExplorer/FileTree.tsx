import { Directory, File } from "@/domain/Workspace"
import React from "react"
import { DirectoryNode } from "./DirectoryNode"
import { FileNode } from "./FileNode"

export declare namespace FileTree {
  export interface OnClick {
    (event: React.MouseEvent<HTMLButtonElement>, node: File | Directory): void
  }
}

export function FileTree({
  tree,
  depth = 0,
  onClick
}: {
  readonly tree: ReadonlyArray<Directory | File>
  readonly depth?: number
  readonly onClick?: FileTree.OnClick
}) {
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
