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
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { useWorkspaceHandle } from "../../context/workspace"
import { Directory, File } from "../../domain/workspace"
import {
  State,
  useExplorerDispatch,
  useExplorerState,
  useRename,
  useRemove,
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
  const [selectedPath, setSelectedPath] = useAtom(handle.selectedPath)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const rename = useRename()
  const isEditing = useMemo(
    () => state._tag === "Editing" && Equal.equals(state.node, node),
    [state, node],
  )
  const isSelected = selectedPath === path

  const handleClick = useCallback<FileNode.OnClick>(
    (event, node) => {
      if (node._tag === "File") {
        setSelectedPath(path)
      }
      onClick?.(event, node)
    },
    [onClick, path, setSelectedPath],
  )

  return isEditing ? (
    <FileInput
      finalFocus={triggerRef}
      type={node._tag}
      depth={depth}
      initialValue={node.name}
      onSubmit={(name) => rename(node, name)}
    />
  ) : (
    <FileNodeRoot
      className={cn("grid-cols-[minmax(0,1fr)_auto]", className)}
      isSelected={isSelected}
    >
      <FileNodeTrigger
        ref={triggerRef}
        depth={depth}
        expanded={props.type === "directory" ? props.isOpen : undefined}
        current={props.type === "file" && isSelected}
        onClick={(event) => handleClick(event, node)}
      >
        <FileNodeIcon {...props} />
        <FileNodeName node={node} />
      </FileNodeTrigger>
      <FileNodeControls className="justify-self-end" node={node} />
    </FileNodeRoot>
  )
}

function FileNodeRoot({
  children,
  className,
  isSelected,
}: React.PropsWithChildren<{
  readonly className?: string
  readonly isSelected: boolean
}>) {
  return (
    <div
      data-selected={isSelected}
      className={cn(
        "group group/file grid items-center rounded-md transition-colors",
        isSelected
          ? "group bg-zinc-200 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-white",
        className,
      )}
    >
      {children}
    </div>
  )
}

function FileNodeTrigger({
  ref,
  children,
  depth,
  expanded,
  current,
  onClick,
}: React.PropsWithChildren<{
  readonly depth: number
  readonly ref: React.Ref<HTMLButtonElement>
  readonly expanded?: boolean | undefined
  readonly current: boolean
  readonly onClick: React.MouseEventHandler<HTMLButtonElement>
}>) {
  const paddingLeft = depth * 12 + 6
  const styles = { paddingLeft: `${paddingLeft}px` }

  return (
    <button
      ref={ref}
      type="button"
      style={styles}
      aria-expanded={expanded}
      aria-current={current ? "true" : undefined}
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
  props:
    | { readonly type: "file" }
    | { readonly type: "directory"; readonly isOpen: boolean },
) {
  if (props.type === "file") {
    return (
      <>
        <span
          className="inline-block h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
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
      <Folder
        className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
        aria-hidden="true"
      />
    </>
  )
}

function FileNodeName({ node }: { readonly node: File | Directory }) {
  const fileName = node.name.split("/").filter(Boolean).pop()
  return <span>{fileName}</span>
}

function FileActionButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="size-7 cursor-pointer rounded border-0 p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      {...props}
    />
  )
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
  const deleteTrigger = useRef<HTMLButtonElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)
  useLayoutEffect(() => {
    if (confirmDelete) cancel.current?.focus()
    else if (wasConfirming.current) deleteTrigger.current?.focus()
    wasConfirming.current = confirmDelete
  }, [confirmDelete])

  return (
    (node._tag === "Directory" || node.userManaged) && (
      <div
        className={cn(
          "w-0 overflow-hidden opacity-0 group-hover/file:w-auto group-hover/file:overflow-visible group-hover/file:opacity-100 group-focus-within/file:w-auto group-focus-within/file:overflow-visible group-focus-within/file:opacity-100 [@media(hover:none)]:w-auto [@media(hover:none)]:overflow-visible [@media(hover:none)]:opacity-100",
          className,
        )}
      >
        <div className="flex h-full items-center gap-0.5 pr-1">
          {node.userManaged && (
            <FileActionButton
              title="Rename"
              aria-label={`Rename ${node.name}`}
              onClick={() => dispatch(State.Editing({ node }))}
            >
              <FilePenIcon size={16} />
            </FileActionButton>
          )}
          {node._tag === "Directory" && (
            <>
              <FileActionButton
                title="New File"
                aria-label={`New file in ${node.name}`}
                onClick={() =>
                  dispatch(State.Creating({ parent: node, type: "File" }))
                }
              >
                <FilePlusIcon size={16} />
              </FileActionButton>
              <FileActionButton
                title="New Folder"
                aria-label={`New folder in ${node.name}`}
                onClick={() =>
                  dispatch(State.Creating({ parent: node, type: "Directory" }))
                }
              >
                <FolderPlusIcon size={16} />
              </FileActionButton>
            </>
          )}
          {node.userManaged &&
            (confirmDelete ? (
              <div
                role="group"
                aria-label={`Delete ${node.name}?`}
                className="flex items-center gap-1 px-1"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault()
                    setConfirmDelete(false)
                  }
                }}
              >
                <button
                  type="button"
                  className="min-h-6 cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                  onClick={(event) => {
                    event.currentTarget
                      .closest<HTMLElement>("[data-file-explorer]")
                      ?.focus({ preventScroll: true })
                    remove(node)
                  }}
                >
                  Yes
                </button>
                <button
                  ref={cancel}
                  type="button"
                  className="min-h-6 cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                  onClick={() => setConfirmDelete(false)}
                >
                  No
                </button>
              </div>
            ) : (
              <FileActionButton
                ref={deleteTrigger}
                title="Delete"
                aria-label={`Delete ${node.name}`}
                onClick={() => setConfirmDelete(true)}
              >
                <TrashIcon size={16} />
              </FileActionButton>
            ))}
        </div>
      </div>
    )
  )
}
