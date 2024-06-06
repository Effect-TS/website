import React, { useCallback, useState } from "react"
import { RxRef, useRxRefProp, useRxSet } from "@effect-rx/rx-react"
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
import { toasterRx } from "@/rx/toasts"

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
  const toast = useRxSet(toasterRx)
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

  function handleSubmitFile(name: string) {
    if (name.includes("/")) {
      return toast({
        title: "Invalid File Name",
        description: "Creating nested files is currently unsupported.",
        variant: "destructive",
        duration: 5000
      })
    }
    if (!name.endsWith(".ts")) {
      return toast({
        title: "Unsupported File Type",
        description: "The playground currently only supports creation of `.ts` files.",
        variant: "destructive",
        duration: 5000
      })
    }
    return node.update((node) => {
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

  function handleSubmitDirectory(name: string) {
    if (name.length === 0) {
      return toast({
        title: "Invalid Directory Name",
        description: "Directory names cannot be empty.",
        variant: "destructive",
        duration: 5000
      })
    }
    if (name.includes("/")) {
      return toast({
        title: "Invalid File Name",
        description: "Creating nested directories is currently unsupported",
        variant: "destructive",
        duration: 5000
      })
    }
    return node.update((node) => {
      const newDirectory = makeDirectory(name, [], true)
      return makeDirectory(
        node.name,
        [...node.children, newDirectory],
        node.userManaged
      )
    })
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
              onSubmit={handleSubmitDirectory}
            />
          )}
          <FileTree tree={children} depth={depth + 1} path={path} />
          {isCreatingFile(state.creationMode) && (
            <AddFile
              type="file"
              depth={depth + 1}
              onSubmit={handleSubmitFile}
            />
          )}
        </>
      )}
    </>
  )
}
