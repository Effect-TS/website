import { useMemo } from "react"
import { Array } from "effect"
import { FileTree as Tree } from "../../domain/workspace"
import { DirectoryNode } from "./directory-node"
import { FileNode } from "./file-node"

export function FileTree({
  tree,
  depth = 0,
  path = ""
}: {
  readonly tree: Tree
  readonly depth?: number
  readonly path?: string
}) {
  const [files, directories] = useMemo(
    () => Array.partition(tree, (_) => _._tag === "Directory"),
    [tree]
  )

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
