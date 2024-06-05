import React, { useCallback } from "react"
import { Equal } from "effect"
import { RxRef, useRx, useRxRef } from "@effect-rx/rx-react"
import { Icon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useWorkspaceHandle } from "@/workspaces/context"
import { Directory, File } from "@/workspaces/domain/workspace"
import { Action, FileExplorer, useExplorerDispatch } from "../file-explorer"

export declare namespace FileNode {
  export type Props = FileProps | DirectoryProps

  export interface FileProps extends CommonProps {
    readonly type: "file"
    readonly node: RxRef.RxRef<File>
  }

  export interface DirectoryProps extends CommonProps {
    readonly type: "directory"
    readonly node: RxRef.RxRef<Directory>
    readonly isOpen: boolean
  }

  export interface CommonProps {
    readonly depth: number
    readonly path: string
    readonly className?: string
    readonly onClick?: OnClick
    readonly onRemove: () => void
  }

  export interface OnClick {
    (event: React.MouseEvent<HTMLButtonElement>, node: File | Directory): void
  }
}

export function FileNode({
  depth,
  node: nodeRef,
  path,
  className,
  onClick,
  onRemove,
  ...props
}: FileNode.Props) {
  const node = useRxRef(nodeRef as RxRef.RxRef<File | Directory>)
  const handle = useWorkspaceHandle()
  const [selectedFile, setSelectedFile] = useRx(handle.selectedFile)
  const isSelected = Equal.equals(selectedFile, node)

  const handleClick = useCallback<FileNode.OnClick>(
    (event, node) => {
      if (node._tag === "File") {
        setSelectedFile(node)
      }
      onClick?.(event, node)
    },
    [onClick, setSelectedFile]
  )

  return (
    <FileNodeRoot isSelected={isSelected}>
      <FileNodeTrigger
        depth={depth}
        isSelected={isSelected}
        onClick={(event) => handleClick(event, node)}
      >
        <FileNodeIcon {...props} />
        <FileNodeName node={node} />
      </FileNodeTrigger>
      <FileNodeControls
        isUserManaged={node.userManaged}
        path={path}
        type={props.type}
        onRemove={onRemove}
      />
    </FileNodeRoot>
  )
}

function FileNodeRoot({
  children,
  isSelected
}: React.PropsWithChildren<{
  isSelected: boolean
}>) {
  return (
    <div
      className={cn(
        "flex items-center transition-colors",
        isSelected
          ? "bg-gray-200 dark:bg-zinc-800"
          : "hover:bg-gray-200/50 dark:hover:bg-zinc-800/50"
      )}
    >
      {children}
    </div>
  )
}

function FileNodeTrigger({
  children,
  depth,
  isSelected,
  onClick
}: React.PropsWithChildren<{
  readonly depth: number
  readonly isSelected: boolean
  readonly onClick: React.MouseEventHandler<HTMLButtonElement>
}>) {
  // Tailwind cannot dynamically generate styles, so we resort to the `style` prop here
  const paddingLeft = 16 + depth * 8
  const styles = { paddingLeft: `${paddingLeft}px` }

  return (
    <button
      type="button"
      style={styles}
      className={cn(
        "flex grow items-center py-1 [&_svg]:mr-1 [&_span]:truncate",
        isSelected
          ? "text-blue-500 dark:text-sky-500"
          : "hover:text-blue-500 dark:hover:text-sky-500"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function FileNodeIcon(
  props:
    | { readonly type: "file" }
    | { readonly type: "directory"; readonly isOpen: boolean }
) {
  return props.type === "file" ? (
    <Icon name="file" />
  ) : props.isOpen ? (
    <Icon name="directory-open" />
  ) : (
    <Icon name="directory-closed" />
  )
}

function FileNodeName({ node }: { readonly node: File | Directory }) {
  const fileName = node.name.split("/").filter(Boolean).pop()
  return <span>{fileName}</span>
}

function FileNodeControls({
  isUserManaged,
  path,
  type,
  onRemove
}: {
  readonly isUserManaged: boolean
  readonly path: string
  readonly type: FileExplorer.InputType
  readonly onRemove: () => void
}) {
  const dispatch = useExplorerDispatch()

  return (
    <div className="flex items-center gap-2 mr-2">
      {type === "directory" && (
        <>
          <Button
            variant="ghost"
            className="h-full p-0 rounded-none"
            onClick={() =>
              dispatch(
                Action.ShowInput({
                  type: "file",
                  path
                })
              )
            }
          >
            <span className="sr-only">Add File</span>
            <Icon name="file-plus" />
          </Button>
          <Button
            variant="ghost"
            className="h-full p-0 rounded-none"
            onClick={() =>
              dispatch(
                Action.ShowInput({
                  type: "directory",
                  path
                })
              )
            }
          >
            <span className="sr-only">Add Directory</span>
            <Icon name="directory-plus" />
          </Button>
        </>
      )}
      {isUserManaged && (
        <Button
          variant="ghost"
          className="h-full p-0 rounded-none"
          onClick={onRemove}
        >
          <span className="sr-only">Delete</span>
          <Icon name="close" className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
