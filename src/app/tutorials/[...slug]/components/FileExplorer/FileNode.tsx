import React, { useCallback } from "react"
import { DirectoryIconClosed, DirectoryIconOpen, FileIcon } from "./Icons"
import { Directory, File } from "@/domain/Workspace"

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

export const FileNode: React.FC<FileNode.Props> = ({
  depth,
  node,
  onClick,
  ...props
}) => {
  const fileName = node.name.split("/").filter(Boolean).pop()
  // Tailwind cannot dynamically generate styles, so we resort to the `style` prop here
  const styles = { paddingLeft: `${18 * depth}px` }

  return (
    <button
      type="button"
      style={styles}
      className="flex items-center mb-1 [&_svg]:mr-1 text-sm"
      onClick={(event) => onClick?.(event, node)}
    >
      {props.type === "file" ? <FileIcon /> : props.isOpen ? <DirectoryIconOpen /> : <DirectoryIconClosed />}
      <span>{fileName}</span>
    </button>
  )
}

FileNode.displayName = "FileNode"
