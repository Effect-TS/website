import React, { useCallback, useMemo, useState } from "react"
import { Equal } from "effect"
import { useRx } from "@effect-rx/rx-react"
import { Icon } from "@/components/icons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useWorkspaceHandle } from "@/workspaces/context"
import { Directory, File } from "@/workspaces/domain/workspace"
import {
  State,
  useExplorerDispatch,
  useExplorerState,
  useRemove,
  useRename
} from "../file-explorer"
import { FileInput } from "./file-input"

export declare namespace FileNode {
  export type Props = FileProps | DirectoryProps

  export interface FileProps extends CommonProps {
    readonly type: "file"
    readonly node: File
  }

  export interface DirectoryProps extends CommonProps {
    readonly type: "directory"
    readonly node: Directory
    readonly isOpen: boolean
  }

  export interface CommonProps {
    readonly depth: number
    readonly path: string
    readonly className?: string
    readonly onClick?: OnClick
  }

  export interface OnClick {
    (event: React.MouseEvent<HTMLButtonElement>, node: File | Directory): void
  }
}

export function FileNode({
  depth,
  node,
  path,
  className,
  onClick,
  ...props
}: FileNode.Props) {
  const handle = useWorkspaceHandle()
  const state = useExplorerState()
  const [selectedFile, setSelectedFile] = useRx(handle.selectedFile)
  const [showControls, setShowControls] = useState(false)
  const rename = useRename()
  const isEditing = useMemo(
    () => state._tag === "Editing" && Equal.equals(state.node, node),
    [state, node]
  )
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

  return isEditing ? (
    <FileInput
      type={node._tag}
      depth={depth}
      initialValue={node.name}
      onSubmit={(name) => rename(node, name)}
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
      {showControls && <FileNodeControls node={node} />}
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

function FileNodeControls({ node }: { readonly node: File | Directory }) {
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const remove = useRemove()

  const isIdle = state._tag === "Idle"

  return (
    <div className="flex items-center gap-2 mr-2">
      {node.userManaged && (
        <Tooltip disableHoverableContent={!isIdle}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="h-full p-0 rounded-none"
              onClick={() => dispatch(State.Editing({ node }))}
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
      {node._tag === "Directory" && (
        <>
          <Tooltip disableHoverableContent={!isIdle}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-full p-0 rounded-none"
                onClick={() =>
                  dispatch(
                    State.Creating({
                      parent: node,
                      type: "File"
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
                    State.Creating({
                      parent: node,
                      type: "Directory"
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
      {node.userManaged && (
        <Tooltip disableHoverableContent={!isIdle}>
          <TooltipTrigger asChild>
            <DeleteNode
              title="Are you sure?"
              description={`This action cannot be undone. This will permanently delete the ${node._tag.toLowerCase()}.`}
              onCancel={() => void 0}
              onConfirm={() => remove(node)}
            />
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Delete</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function DeleteNode({
  title,
  description,
  onCancel,
  onConfirm
}: {
  readonly title: string
  readonly description: string
  readonly onCancel?: () => void
  readonly onConfirm?: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="h-full p-0 rounded-none">
          <span className="sr-only">Delete</span>
          <Icon name="trash" className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="border-destructive bg-destructive hover:bg-destructive/80 text-destructive-foreground"
            onClick={onConfirm}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
