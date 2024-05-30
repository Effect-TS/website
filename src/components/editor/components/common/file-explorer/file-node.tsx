import React from "react"
import { Equal } from "effect"
import { useRxValue } from "@effect-rx/rx-react"
import { useWorkspaceHandle } from "@/workspaces/context"
import { Directory, File } from "@/workspaces/domain/workspace"
import { Icon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  const isSelected = Equal.equals(selected, node)
  const fileName = node.name.split("/").filter(Boolean).pop()
  // Tailwind cannot dynamically generate styles, so we resort to the `style` prop here
  const paddingLeft = 16 + depth * 8
  const styles = { paddingLeft: `${paddingLeft}px` }

  return (
    <div
      className={cn(
        "w-full flex items-center text-sm transition-colors",
        isSelected
          ? "bg-gray-200 dark:bg-zinc-800"
          : "hover:bg-gray-200/50 dark:hover:bg-zinc-800/50"
      )}
    >
      <button
        type="button"
        style={styles}
        className={cn(
          "flex grow items-center py-1 [&_svg]:mr-1 [&_span]:truncate",
          isSelected
            ? "text-blue-500 dark:text-sky-500"
            : "hover:text-blue-500 dark:hover:text-sky-500"
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
      {props.type === "directory" && <FileControls />}
    </div>
  )
}

FileNode.displayName = "FileNode"

function FileControls() {
  return (
    <div className="flex items-center gap-2 mr-2">
      <Button variant="ghost" className="h-full p-0 rounded-none">
        <span className="sr-only">Add File</span>
        <Icon name="file-plus" />
      </Button>
      <Button variant="ghost" className="h-full p-0 rounded-none">
        <span className="sr-only">Add Directory</span>
        <Icon name="directory-plus" />
      </Button>
    </div>
  )
}