import React, { useCallback, useState } from "react"
import { RxRef, useRxRefProp } from "@effect-rx/rx-react"
import {
  File,
  makeDirectory,
  type Directory
} from "@/workspaces/domain/workspace"
import {
  FileExplorer,
  CreationMode,
  useExplorerState
} from "../file-explorer"
import { FileNode } from "./file-node"
import { FileTree } from "./file-tree"
import { AddFile } from "./add-file"

export declare namespace DirectoryNode {
  export interface Props {
    readonly node: RxRef.RxRef<Directory>
    readonly depth: number
    readonly path: string
    readonly onRemove: () => void
  }

  export interface OnCreateFile {
    (event: React.MouseEventHandler<HTMLButtonElement>): void
  }

  export interface OnCreateDirectory {
    (event: React.MouseEventHandler<HTMLButtonElement>): void
  }
}

export function DirectoryNode({
  depth,
  node,
  path,
  onRemove
}: DirectoryNode.Props) {
  const [open, setOpen] = useState(true)
  const state = useExplorerState()
  const children = useRxRefProp(node, "children")

  const handleToggle = useCallback(() => setOpen((prev) => !prev), [])

  function isCreatingFile(mode: FileExplorer.CreationMode) {
    return CreationMode.$is("CreatingFile")(mode) && mode.path === path
  }

  function isCreatingDirectory(mode: FileExplorer.CreationMode) {
    return CreationMode.$is("CreatingDirectory")(mode) && mode.path === path
  }

  return (
    <>
      <FileNode
        type="directory"
        node={node}
        depth={depth}
        path={path}
        isOpen={open}
        onClick={handleToggle}
        onRemove={onRemove}
      />
      {open && (
        <>
          {isCreatingDirectory(state.creationMode) && (
            <AddFile
              type="directory"
              depth={depth + 1}
              onSubmit={(name) =>
                node.update((node) => {
                  const newDirectory = makeDirectory(name, [], true)
                  return makeDirectory(
                    node.name,
                    [...node.children, newDirectory],
                    node.userManaged
                  )
                })
              }
            />
          )}
          <FileTree tree={children} depth={depth + 1} path={path} />
          {isCreatingFile(state.creationMode) && (
            <AddFile
              type="file"
              depth={depth + 1}
              onSubmit={(name) =>
                node.update((node) => {
                  const newFile = new File({
                    name,
                    initialContent: "",
                    userManaged: true
                  })
                  return makeDirectory(
                    node.name,
                    [...node.children, newFile],
                    node.userManaged
                  )
                })
              }
            />
          )}
        </>
      )}
    </>
  )
}
