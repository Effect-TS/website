import React from "react"
import { DirectoryIconClosed, DirectoryIconOpen, FileIcon } from "./Icons"

export declare namespace FileNode {
  export type Props = FileProps | DirectoryProps

  export interface FileProps extends CommonProps {
    readonly type: "file"
  }

  export interface DirectoryProps extends CommonProps {
    readonly type: "directory"
    readonly isOpen?: boolean
  }

  export interface CommonProps {
    readonly path: string
    readonly depth: number
    readonly onClick?: OnClick
  }

  export type OnClick = React.MouseEventHandler<HTMLButtonElement>
}

export const FileNode: React.FC<FileNode.Props> = ({
  depth,
  path,
  ...props
}) => {
  const fileName = path.split("/").filter(Boolean).pop()
  // Tailwind cannot dynamically generate styles, so we resort to the `style` prop here
  const styles = { paddingLeft: `${18 * depth}px` }

  return (
    <button type="button" style={styles} className="flex items-center mb-1 [&_svg]:mr-1 text-sm">
      {props.type === "file" ? <FileIcon /> : props.isOpen ? <DirectoryIconOpen /> : <DirectoryIconClosed />}
      <span>{fileName}</span>
    </button>
  )
}

FileNode.displayName = "FileNode"
