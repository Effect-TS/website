import React, { useCallback, useState } from "react"
import { RxRef, useRxRefProp, useRxSet } from "@effect-rx/rx-react"
import { File, makeDirectory, Directory } from "@/workspaces/domain/workspace"
import { FileExplorer, Mode, useExplorerState } from "../file-explorer"
import { FileNode } from "./file-node"
import { FileTree } from "./file-tree"
import { FileInput } from "./file-input"
import { toasterRx } from "@/rx/toasts"
import { useWorkspaceHandle } from "@/workspaces/context"

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
  const handle = useWorkspaceHandle()
  const setSelectedFile = useRxSet(handle.selectedFile)
  const toast = useRxSet(toasterRx)
  const [open, setOpen] = useState(true)
  const state = useExplorerState()
  const children = useRxRefProp(node, "children")

  const handleToggle = useCallback(() => setOpen((prev) => !prev), [])

  function isCreatingFile(
    mode: FileExplorer.Mode
  ): mode is FileExplorer.CreatingNode {
    return (
      Mode.$is("CreatingNode")(mode) &&
      mode.type === "file" &&
      mode.path === path
    )
  }

  function isCreatingDirectory(
    mode: FileExplorer.Mode
  ): mode is FileExplorer.CreatingNode {
    return (
      Mode.$is("CreatingNode")(mode) &&
      mode.type === "directory" &&
      mode.path === path
    )
  }

  const handleCreateFile = useCallback(
    (name: string) => {
      if (name.includes("/")) {
        return toast({
          title: "Invalid File Name",
          description: "Creating nested files is currently unsupported.",
          variant: "destructive",
          duration: 5000
        })
      }
      if (!/[a-zA-Z0-9]{1}.*\.ts/.test(name)) {
        return toast({
          title: "Unsupported File Type",
          description:
            "The playground currently only supports creation of `.ts` files.",
          variant: "destructive",
          duration: 5000
        })
      }
      const newFile = new File({
        name,
        initialContent: "",
        userManaged: true
      })
      node.update((node) => {
        return makeDirectory(
          node.name,
          [...node.children, newFile],
          node.userManaged
        )
      })
      setSelectedFile(newFile)
    },
    [node, setSelectedFile, toast]
  )

  const handleCreateDirectory = useCallback(
    (name: string) => {
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
    },
    [node, toast]
  )

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
          {isCreatingDirectory(state.mode) && (
            <FileInput
              type={state.mode.type}
              depth={depth + 1}
              onSubmit={handleCreateDirectory}
            />
          )}
          <FileTree tree={children} depth={depth + 1} path={path} />
          {isCreatingFile(state.mode) && (
            <FileInput
              type={state.mode.type}
              depth={depth + 1}
              onSubmit={handleCreateFile}
            />
          )}
        </>
      )}
    </>
  )
}
