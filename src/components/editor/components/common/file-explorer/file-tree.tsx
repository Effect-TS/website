import React, { useMemo } from "react"
import { Array } from "effect"
import {
  Directory,
  File,
  FileTree as Tree
} from "@/workspaces/domain/workspace"
import { DirectoryNode } from "./directory-node"
import { FileNode } from "./file-node"
import { RxRef, useRxRef } from "@effect-rx/rx-react"

const isFile = (node: File | Directory): node is File => node._tag === "File"

export function FileTree({
  tree,
  depth = 0,
  path = ""
}: {
  readonly tree: RxRef.RxRef<Tree>
  readonly depth?: number
  readonly path?: string
}) {
  const treeValue = useRxRef(tree)
  const [files, directories] = useMemo(() => {
    const refs = treeValue.map((_, index) => tree.prop(index))
    return Array.partition(
      refs as Array<RxRef.RxRef<Directory> | RxRef.RxRef<File>>,
      (ref): ref is RxRef.RxRef<Directory> => ref.value._tag === "Directory"
    )
  }, [treeValue, tree])

  return (
    <div className="text-sm">
      {directories.map((node) => {
        const fullPath = `${path}/${node.value.name}`
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
        const fullPath = `${path}/${node.value.name}`
        return (
          <FileNode
            key={fullPath}
            type="file"
            node={node.value}
            depth={depth}
            path={fullPath}
          />
        )
      })}
    </div>
  )
}
