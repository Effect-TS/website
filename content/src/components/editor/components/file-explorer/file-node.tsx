import React, { useCallback, useMemo, useState } from "react"
import { Equal } from "effect"
import {
  FileIcon,
  FilePenIcon,
  FilePlusIcon,
  FolderClosedIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  TrashIcon
} from "lucide-react"
import { useAtom } from "@effect-atom/atom-react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/css/utils"
import { useWorkspaceHandle } from "../../context/workspace"
import { Directory, File } from "../../domain/workspace"
import { State, useExplorerDispatch, useExplorerState, useRemove, useRename } from "../file-explorer"
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

export function FileNode({ depth, node, path, className, onClick, ...props }: FileNode.Props) {
  const handle = useWorkspaceHandle()
  const state = useExplorerState()
  const [selectedFile, setSelectedFile] = useAtom(handle.selectedFile)
  const [showControls, setShowControls] = useState(false)
  const rename = useRename()
  const isEditing = useMemo(() => state._tag === "Editing" && Equal.equals(state.node, node), [state, node])
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
    <FileInput type={node._tag} depth={depth} initialValue={node.name} onSubmit={(name) => rename(node, name)} />
  ) : (
    <FileNodeRoot
      className={showControls ? "grid-cols-[minmax(0,1fr)_auto]" : "auto-cols-auto"}
      isSelected={isSelected}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <FileNodeTrigger depth={depth} isSelected={isSelected} onClick={(event) => handleClick(event, node)}>
        <FileNodeIcon {...props} />
        <FileNodeName node={node} />
      </FileNodeTrigger>
      {showControls && <FileNodeControls className="justify-self-end" node={node} />}
    </FileNodeRoot>
  )
}

function FileNodeRoot({
  children,
  className,
  isSelected,
  onMouseEnter,
  onMouseLeave
}: React.PropsWithChildren<{
  readonly className?: string
  readonly isSelected: boolean
  readonly onMouseEnter: () => void
  readonly onMouseLeave: () => void
}>) {
  return (
    <div
      data-selected={isSelected}
      className={cn(
        "grid items-center transition-colors",
        isSelected
          ? "group bg-[--sl-color-text-accent]"
          : "hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5]",
        className
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
        "w-full grid grid-cols-[16px_auto] gap-2 items-center justify-start py-1 bg-transparent cursor-pointer [&_svg]:mr-1 [&_span]:truncate",
        isSelected && "text-[--sl-color-text-invert]"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function FileNodeIcon(props: { readonly type: "file" } | { readonly type: "directory"; readonly isOpen: boolean }) {
  return props.type === "file" ? (
    <FileIcon size={16} />
  ) : props.isOpen ? (
    <FolderOpenIcon size={16} />
  ) : (
    <FolderClosedIcon size={16} />
  )
}

function FileNodeName({ node }: { readonly node: File | Directory }) {
  const fileName = node.name.split("/").filter(Boolean).pop()
  return <span>{fileName}</span>
}

function FileNodeControls({ className, node }: { readonly className?: string; readonly node: File | Directory }) {
  const state = useExplorerState()
  const dispatch = useExplorerDispatch()
  const remove = useRemove()

  const isIdle = state._tag === "Idle"

  return (
    (node._tag === "Directory" || node.userManaged) && (
      <div className={cn("h-full flex items-center [&_button]:px-1 [&_button]:rounded-none", className)}>
        {node.userManaged && (
          <Tooltip disableHoverableContent={!isIdle}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-full p-0 bg-transparent cursor-pointer group-data-[selected=true]:bg-[--sl-color-text-accent] group-data-[selected=true]:text-[--sl-color-text-invert]"
                onClick={() => dispatch(State.Editing({ node }))}
              >
                <span className="sr-only">Edit</span>
                <FilePenIcon size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="text-[--sl-color-text] bg-[--sl-color-black] ring-1 ring-inset ring-[--sl-color-text]"
            >
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
                  className="h-full p-0 bg-transparent cursor-pointer group-data-[selected=true]:bg-[--sl-color-text-accent] group-data-[selected=true]:text-[--sl-color-text-invert]"
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
                  <FilePlusIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-[--sl-color-text] bg-[--sl-color-black] ring-1 ring-inset ring-[--sl-color-text]"
              >
                <p>New File...</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip disableHoverableContent={!isIdle}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-full p-0 bg-transparent cursor-pointer group-data-[selected=true]:bg-[--sl-color-text-accent] group-data-[selected=true]:text-[--sl-color-text-invert]"
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
                  <FolderPlusIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="text-[--sl-color-text] bg-[--sl-color-black] ring-1 ring-inset ring-[--sl-color-text]"
              >
                <p>New Folder...</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
        {node.userManaged && (
          <AlertDialog>
            <Tooltip disableHoverableContent={!isIdle}>
              <AlertDialogTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-full p-0 bg-transparent cursor-pointer group-data-[selected=true]:bg-[--sl-color-text-accent] group-data-[selected=true]:text-[--sl-color-text-invert]"
                  >
                    <span className="sr-only">Delete</span>
                    <TrashIcon size={16} />
                  </Button>
                </TooltipTrigger>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[--sl-color-bg-nav]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[--sl-color-white]">Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[--sl-color-text]">
                    This action cannot be undone. This will permanently delete the {node._tag.toLowerCase()}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-[--sl-color-bg] hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5] border border-[--sl-color-text] cursor-pointer">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="border-destructive bg-destructive hover:bg-destructive/80 text-destructive-foreground border border-[--sl-color-text] cursor-pointer"
                    onClick={() => remove(node)}
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
              <TooltipContent
                side="bottom"
                className="text-[--sl-color-text] bg-[--sl-color-black] ring-1 ring-inset ring-[--sl-color-text]"
              >
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </AlertDialog>
        )}
      </div>
    )
  )
}
