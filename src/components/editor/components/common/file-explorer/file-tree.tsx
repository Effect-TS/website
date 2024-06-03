import React from "react"
import { Array } from "effect"
import { Directory, File } from "@/workspaces/domain/workspace"
import { DirectoryNode } from "./directory-node"
import { FileNode } from "./file-node"

const isFile = (node: File | Directory): node is File => node._tag === "File"

export function FileTree({
  tree,
  depth = 0,
  path = ""
}: {
  readonly tree: ReadonlyArray<File | Directory>
  readonly depth?: number
  readonly path?: string
}) {
  const [directories, files] = Array.partition(tree, isFile)

  return (
    <div className="text-sm">
      {directories.map((node) => {
        const fullPath = `${path}/${node.name}`
        return (
          <DirectoryNode
            key={fullPath}
            node={node}
            depth={depth}
            path={fullPath}
          />
        )
      })}
      {files.map((node) => {
        const fullPath = `${path}/${node.name}`
        return (
          <FileNode
            key={fullPath}
            type="file"
            node={node}
            depth={depth}
            path={fullPath}
          />
        )
      })}
    </div>
  )
}
