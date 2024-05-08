import React from "react"
import { Directory, File } from "@/domain/Workspace"
import { DirectoryNode } from "./DirectoryNode"
import { FileNode } from "./FileNode"

export declare namespace FileTree {
  export interface Props {
    readonly tree: ReadonlyArray<Directory | File>
    readonly prefix?: string
    readonly depth?: number
  }
}

export const FileTree: React.FC<FileTree.Props> = ({
  tree,
  prefix = "/",
  depth = 0
}) => {
  const files = tree.filter((node): node is File => node._tag === "File")
  const directories = tree.filter((node): node is Directory => node._tag === "Directory")

  return (
    <div>
      {directories.map((node) => (
        <DirectoryNode
          key={node.name}
          prefix={prefix + node.name}
          nodes={node.children}
          depth={depth}
        />
      ))}
      {files.map((node) => (
        <FileNode
          type="file"
          key={node.name}
          path={node.name}
          depth={depth}
        />
      ))}
    </div>
  )
}

FileTree.displayName = "FileTree"
