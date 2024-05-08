import React from "react"
import clsx from "clsx"
import * as Equal from "effect/Equal"
import { useRxValue } from "@effect-rx/rx-react"
import { Directory, File } from "@/domain/Workspace"
import { DirectoryIconClosed, DirectoryIconOpen, FileIcon } from "./Icons"
import { useWorkspace } from "../../../context/WorkspaceContext"

export declare namespace FileNode {
  export type Props = FileProps | DirectoryProps

  export interface FileProps extends CommonProps {
    readonly type: "file"
    readonly node: File
  }

  export interface DirectoryProps extends CommonProps {
    readonly type: "directory"
    readonly node: Directory
    readonly isOpen?: boolean
  }

  export interface CommonProps {
    readonly depth: number
    readonly onClick?: OnClick
  }

  export interface OnClick {
    (event: React.MouseEvent<HTMLButtonElement>, node: File | Directory): void
  }
}

export function FileNode({ depth, node, onClick, ...props }: FileNode.Props) {
  const { selectedFile } = useWorkspace()
  const selected = useRxValue(selectedFile)
  const fileName = node.name.split("/").filter(Boolean).pop()
  // Tailwind cannot dynamically generate styles, so we resort to the `style` prop here
  const paddingLeft = 16 + depth * 8
  const styles = { paddingLeft: `${paddingLeft}px` }

  return (
    <button
      type="button"
      style={styles}
      className={clsx(
        "w-full flex items-center py-1 text-sm transition-colors [&_svg]:mr-1 [&_span]:truncate",
        Equal.equals(selected, node)
          ? "text-blue-500 dark:text-sky-500 bg-gray-200 dark:bg-zinc-800"
          : "hover:text-blue-500 dark:hover:text-sky-500 hover:bg-gray-200/50 dark:hover:bg-zinc-800/50"
      )}
      onClick={(event) => onClick?.(event, node)}
    >
      {props.type === "file" ? (
        <FileIcon />
      ) : props.isOpen ? (
        <DirectoryIconOpen />
      ) : (
        <DirectoryIconClosed />
      )}
      <span>{fileName}</span>
    </button>
  )
}

FileNode.displayName = "FileNode"
