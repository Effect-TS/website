import React from "react"
import { File } from "./File"
import * as Array from "effect/Array"
import * as Either from "effect/Either"
import type { DirectoryNode, FileNode, FileSystemTree } from "@webcontainer/api"
import { Directory } from "./Directory"

export declare namespace ModuleList {
  export interface Props {
    readonly pathPrefix: string
    readonly tree: DirectoryNode
    readonly depth?: number
  }
}

export const ModuleList: React.FC<ModuleList.Props> = ({
  tree,
  depth = 0,
  pathPrefix = "/"
}) => {
  const entries = Object.entries(tree)
  const directories = entries.filter(([, node]) => isDirectoryNode(node))
  const files = entries.filter(([, node]) => isFileNode(node))
  console.log({ directories })
  return (
    <div>
      {directories.map(([path, node]) => {
        console.log({ node })
        return (
          <Directory
            key={pathPrefix + path}
            pathPrefix={pathPrefix + path}
            tree={{ [pathPrefix + path]: node }}
            depth={depth} />
        )
      })}
      {files.map(([path, node]) => (
        <File
          type="file"
          key={pathPrefix + path}
          path={pathPrefix + path}
        />
      ))}
    </div>
  )
}

const isFileNode = (node: FileNode | DirectoryNode): node is FileNode =>
  "file" in node

const isDirectoryNode = (node: FileNode | DirectoryNode): node is DirectoryNode =>
  "directory" in node

ModuleList.displayName = "ModuleList"