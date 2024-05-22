import React from "react"
import { useWorkspaceHandle } from "@/components/editor/context/workspace"
import { Directory, File } from "@/components/editor/domain/workspace"
import { Icon } from "@/components/icons"
import { cn } from "@/lib/utils"
import { useRxValue } from "@effect-rx/rx-react"
import * as Equal from "effect/Equal"

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
  const { selectedFile } = useWorkspaceHandle()
  const selected = useRxValue(selectedFile)
  const fileName = node.name.split("/").filter(Boolean).pop()
  // Tailwind cannot dynamically generate styles, so we resort to the `style` prop here
  const paddingLeft = 16 + depth * 8
  const styles = { paddingLeft: `${paddingLeft}px` }

  return (
    <button
      type="button"
      style={styles}
      className={cn(
        "w-full flex items-center py-1 text-sm transition-colors [&_svg]:mr-1 [&_span]:truncate",
        Equal.equals(selected, node)
          ? "text-blue-500 dark:text-sky-500 bg-gray-200 dark:bg-zinc-800"
          : "hover:text-blue-500 dark:hover:text-sky-500 hover:bg-gray-200/50 dark:hover:bg-zinc-800/50"
      )}
      onClick={(event) => onClick?.(event, node)}
    >
      {props.type === "file" ? (
        <Icon name="file" />
      ) : props.isOpen ? (
        <Icon name="directory-open" />
      ) : (
        <Icon name="directory-closed" />
      )}
      <span>{fileName}</span>
    </button>
  )
}

FileNode.displayName = "FileNode"
