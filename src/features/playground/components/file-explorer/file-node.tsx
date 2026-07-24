import { useAtom } from "@effect/atom-react"
import { Equal } from "effect"
import {
  ChevronDown,
  ChevronRight,
  FileIcon,
  FilePenIcon,
  FilePlusIcon,
  Folder,
  FolderPlusIcon,
  TrashIcon,
} from "lucide-react"
import React, { useCallback, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { useWorkspaceHandle } from "../../context/workspace"
import { Directory, File } from "../../domain/workspace"
import {
  State,
  useExplorerDispatch,
  useExplorerState,
  useRemove,
  useRename,
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
  path: _path,
  className,
  onClick,
  ...props
}: FileNode.Props) {
  const handle = useWorkspaceHandle()
  const state = useExplorerState()
  const [selectedFile, setSelectedFile] = useAtom(handle.selectedFile)
  const [showControls, setShowControls] = useState(false)
  const rename = useRename()
  const isEditing = useMemo(
    () => state._tag === "Editing" && Equal.equals(state.node, node),
    [state, node],
  )
  const isSelected = Equal.equals(selectedFile, node)

  const handleClick = useCallback<FileNode.OnClick>(
    (event, node) => {
      if (node._tag === "File") {
        setSelectedFile(node)
      }
      onClick?.(event, node)
    },
    [onClick, setSelectedFile],
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
      className={cn(showControls ? "grid-cols-[minmax(0,1fr)_auto]" : "auto-cols-auto", className)}
      isSelected={isSelected}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <FileNodeTrigger depth={depth} onClick={(event) => handleClick(event, node)}>
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
  onMouseLeave,
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
        "grid items-center rounded-md transition-colors",
        isSelected
          ? "group bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-white",
        className,
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
  onClick,
}: React.PropsWithChildren<{
  readonly depth: number
  readonly onClick: React.MouseEventHandler<HTMLButtonElement>
}>) {
  const paddingLeft = depth * 12 + 6
  const styles = { paddingLeft: `${paddingLeft}px` }

  return (
    <button
      type="button"
      style={styles}
      className={cn(
        "grid w-full cursor-pointer grid-cols-[14px_16px_auto] items-center justify-start gap-1.5 bg-transparent py-1.5 [&_span]:truncate",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function FileNodeIcon(
  props: { readonly type: "file" } | { readonly type: "directory"; readonly isOpen: boolean },
) {
  if (props.type === "file") {
    return (
      <>
        <span className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <FileIcon
          className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
          aria-hidden="true"
        />
      </>
    )
  }
  return (
    <>
      {props.isOpen ? (
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400"
          aria-hidden="true"
        />
      ) : (
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400"
          aria-hidden="true"
        />
      )}
      <Folder className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
    </>
  )
}

function FileNodeName({ node }: { readonly node: File | Directory }) {
  const fileName = node.name.split("/").filter(Boolean).pop()
  return <span>{fileName}</span>
}

function FileNodeControls({
  className,
  node,
}: {
  readonly className?: string
  readonly node: File | Directory
}) {
  const dispatch = useExplorerDispatch()
  const remove = useRemove()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    (node._tag === "Directory" || node.userManaged) && (
      <div className={cn("flex h-full items-center gap-0.5 pr-1", className)}>
        {node.userManaged && (
          <button
            type="button"
            title="Rename"
            className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors group-data-[selected=true]:text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 group-data-[selected=true]:hover:bg-zinc-300 group-data-[selected=true]:hover:text-zinc-800 dark:text-zinc-500 dark:group-data-[selected=true]:text-zinc-300 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-200 dark:group-data-[selected=true]:hover:bg-zinc-600/60 dark:group-data-[selected=true]:hover:text-white"
            onClick={() => dispatch(State.Editing({ node }))}
          >
            <FilePenIcon size={16} />
          </button>
        )}
        {node._tag === "Directory" && (
          <>
            <button
              type="button"
              title="New File"
              className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors group-data-[selected=true]:text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 group-data-[selected=true]:hover:bg-zinc-300 group-data-[selected=true]:hover:text-zinc-800 dark:text-zinc-500 dark:group-data-[selected=true]:text-zinc-300 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-200 dark:group-data-[selected=true]:hover:bg-zinc-600/60 dark:group-data-[selected=true]:hover:text-white"
              onClick={() => dispatch(State.Creating({ parent: node, type: "File" }))}
            >
              <FilePlusIcon size={16} />
            </button>
            <button
              type="button"
              title="New Folder"
              className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors group-data-[selected=true]:text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 group-data-[selected=true]:hover:bg-zinc-300 group-data-[selected=true]:hover:text-zinc-800 dark:text-zinc-500 dark:group-data-[selected=true]:text-zinc-300 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-200 dark:group-data-[selected=true]:hover:bg-zinc-600/60 dark:group-data-[selected=true]:hover:text-white"
              onClick={() => dispatch(State.Creating({ parent: node, type: "Directory" }))}
            >
              <FolderPlusIcon size={16} />
            </button>
          </>
        )}
        {node.userManaged &&
          (confirmDelete ? (
            <div className="flex items-center gap-1 px-1">
              <button
                type="button"
                className="cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => {
                  remove(node)
                  setConfirmDelete(false)
                }}
              >
                Yes
              </button>
              <button
                type="button"
                className="cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700/60"
                onClick={() => setConfirmDelete(false)}
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              title="Delete"
              className="cursor-pointer rounded p-1.5 text-zinc-400 transition-colors group-data-[selected=true]:text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 group-data-[selected=true]:hover:bg-zinc-300 group-data-[selected=true]:hover:text-zinc-800 dark:text-zinc-500 dark:group-data-[selected=true]:text-zinc-300 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-200 dark:group-data-[selected=true]:hover:bg-zinc-600/60 dark:group-data-[selected=true]:hover:text-white"
              onClick={() => setConfirmDelete(true)}
            >
              <TrashIcon size={16} />
            </button>
          ))}
      </div>
    )
  )
}
