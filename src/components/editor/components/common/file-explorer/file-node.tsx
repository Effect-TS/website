import React, { useCallback, useState } from "react"
import { Equal } from "effect"
import { RxRef, useRx, useRxRef, useRxSet } from "@effect-rx/rx-react"
import { Icon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useWorkspaceHandle } from "@/workspaces/context"
import { Directory, File, makeDirectory } from "@/workspaces/domain/workspace"
import {
  Action,
  Mode,
  FileExplorer,
  useExplorerDispatch,
  useExplorerState
} from "../file-explorer"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { FileInput } from "./file-input"
import { toasterRx } from "@/rx/toasts"

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
  const toast = useRxSet(toasterRx)
  const handle = useWorkspaceHandle()
  const state = useExplorerState()
  const [selectedFile, setSelectedFile] = useRx(handle.selectedFile)
  const [showControls, setShowControls] = useState(false)
  const isEditing =
    Mode.$is("EditingNode")(state.mode) && Equal.equals(state.mode.node, node)
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

  const handleUpdate = useCallback(
    (name: string) => {
      nodeRef.update(((node) => {
        switch (node._tag) {
          case "File": {
            if (name.includes("/")) {
              return toast({
                title: "Invalid File Name",
                description:
                  "Creating nested files is currently unsupported.",
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
            return new File({ ...node, name })
          }
          case "Directory": {
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
                description:
                  "Creating nested directories is currently unsupported",
                variant: "destructive",
                duration: 5000
              })
            }
            return makeDirectory(name, node.children, node.userManaged)
          }
        }
      }) as ((value: File) => File) & ((value: Directory) => Directory))
    },
    [nodeRef, toast]
  )

  return isEditing ? (
    <FileInput
      type={node._tag === "File" ? "file" : "directory"}
      depth={depth}
      initialValue={node.name}
      onSubmit={handleUpdate}
    />
  ) : (
    <FileNodeRoot
      isSelected={isSelected}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <FileNodeTrigger
        depth={depth}
        isSelected={isSelected}
        onClick={(event) => handleClick(event, node)}
      >
        <FileNodeIcon {...props} />
        <FileNodeName node={node} />
      </FileNodeTrigger>
      {showControls && (
        <FileNodeControls
          node={node}
          path={path}
          type={props.type}
          onRemove={onRemove}
          isUserManaged={node.userManaged}
        />
      )}
    </FileNodeRoot>
  )
}

function FileNodeRoot({
  children,
  isSelected,
  onMouseEnter,
  onMouseLeave
}: React.PropsWithChildren<{
  readonly isSelected: boolean
  readonly onMouseEnter: () => void
  readonly onMouseLeave: () => void
}>) {
  return (
    <div
      className={cn(
        "flex items-center transition-colors",
        isSelected
          ? "bg-gray-200 dark:bg-zinc-800"
          : "hover:bg-gray-200/50 dark:hover:bg-zinc-800/50"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
  node,
  path,
  type,
  isUserManaged,
  onRemove
}: {
  readonly node: File | Directory
  readonly path: string
  readonly type: FileExplorer.InputType
  readonly isUserManaged: boolean
  readonly onRemove: () => void
}) {
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()

  const isIdle = Mode.$is("Idle")(state.mode)

  return (
    <div className="flex items-center gap-2 mr-2">
      {isUserManaged && (
        <Tooltip disableHoverableContent={!isIdle}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="h-full p-0 rounded-none"
              onClick={() => dispatch(Action.EditNode({ node }))}
            >
              <span className="sr-only">Edit</span>
              <Icon name="edit" className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Edit</p>
          </TooltipContent>
        </Tooltip>
      )}
      {type === "directory" && (
        <>
          <Tooltip disableHoverableContent={!isIdle}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-full p-0 rounded-none"
                onClick={() =>
                  dispatch(
                    Action.CreateNode({
                      type: "file",
                      path
                    })
                  )
                }
              >
                <span className="sr-only">Add File</span>
                <Icon name="file-plus" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>New File...</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip disableHoverableContent={!isIdle}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-full p-0 rounded-none"
                onClick={() =>
                  dispatch(
                    Action.CreateNode({
                      type: "directory",
                      path
                    })
                  )
                }
              >
                <span className="sr-only">Add Directory</span>
                <Icon name="directory-plus" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>New Folder...</p>
            </TooltipContent>
          </Tooltip>
        </>
      )}
      {isUserManaged && (
        <Tooltip disableHoverableContent={!isIdle}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="h-full p-0 rounded-none"
              onClick={onRemove}
            >
              <span className="sr-only">Delete</span>
              <Icon name="trash" className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Delete</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
