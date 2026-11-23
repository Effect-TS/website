import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as Option from "effect/Option"
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
  X,
} from "lucide-react"
import * as React from "react"
import { useScratchpadSession } from "./context.tsx"
import type { FileDiagnosticSummary } from "./editor.ts"
import { WORKSPACE_PROTECTED_PATHS, type WorkspaceNode } from "./workspace.ts"

/** Whether deleting or renaming `node` would delete or move a protected file. */
const holdsProtectedFile = (node: WorkspaceNode): boolean =>
  node._tag === "File"
    ? WORKSPACE_PROTECTED_PATHS.has(node.path)
    : node.children.some(holdsProtectedFile)

const LOCKED_BUTTON_CLASS =
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500"

type ExplorerMode =
  | { readonly _tag: "Idle" }
  | {
      readonly _tag: "Creating"
      readonly kind: "file" | "directory"
      readonly parentDir: string
    }
  | {
      readonly _tag: "Renaming"
      readonly targetPath: string
      readonly currentName: string
    }
  | {
      readonly _tag: "ConfirmDelete"
      readonly targetPath: string
    }

function InlineNameInput({
  initialValue,
  placeholder,
  onSubmit,
  onCancel,
}: {
  readonly initialValue: string
  readonly placeholder: string
  readonly onSubmit: (value: string) => void
  readonly onCancel: () => void
}) {
  const [value, setValue] = React.useState(initialValue)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const el = inputRef.current
    if (el === null) return
    el.focus()
    const dot = initialValue.lastIndexOf(".")
    if (dot > 0) {
      el.setSelectionRange(0, dot)
    } else {
      el.select()
    }
  }, [initialValue])

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      onCancel()
      return
    }
    onSubmit(trimmed)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex min-w-0 flex-1 items-center gap-1"
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            onCancel()
          }
        }}
        onBlur={onCancel}
        className="w-full min-w-0 rounded border border-zinc-400 bg-white px-1.5 py-0.5 font-mono text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
      />
    </form>
  )
}

function DiagnosticDot({
  summary,
}: {
  readonly summary: FileDiagnosticSummary | undefined
}) {
  if (
    summary === undefined ||
    (summary.errors === 0 && summary.warnings === 0)
  ) {
    return null
  }
  const hasErrors = summary.errors > 0
  const count = hasErrors ? summary.errors : summary.warnings
  const title = hasErrors
    ? `${summary.errors} error${summary.errors === 1 ? "" : "s"}`
    : `${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}`

  return (
    <span
      title={title}
      data-testid="diagnostic-badge"
      className={
        hasErrors
          ? "inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-red-500/15 px-1 font-mono text-[10px] font-medium text-red-600 dark:bg-red-500/20 dark:text-red-400"
          : "inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 px-1 font-mono text-[10px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
      }
    >
      {count}
    </span>
  )
}

const summarizeSubtreeDiagnostics = (
  dirPath: string,
  diagnostics: ReadonlyMap<string, FileDiagnosticSummary>,
): FileDiagnosticSummary | undefined => {
  let errors = 0
  let warnings = 0
  const prefix = `${dirPath}/`
  for (const [path, summary] of diagnostics.entries()) {
    if (path.startsWith(prefix)) {
      errors += summary.errors
      warnings += summary.warnings
    }
  }
  if (errors === 0 && warnings === 0) return undefined
  return { errors, warnings }
}

const parentOf = (path: string): string => {
  const idx = path.lastIndexOf("/")
  return idx === -1 ? "" : path.slice(0, idx)
}

const joinPath = (dir: string, name: string): string =>
  dir.length === 0 ? name : `${dir}/${name}`

export function FileExplorer() {
  const {
    treeAtom,
    activeFileAtom,
    diagnosticsAtom,
    openFileAtom,
    createFileAtom,
    createDirectoryAtom,
    renamePathAtom,
    deletePathAtom,
  } = useScratchpadSession()

  const tree = useAtomValue(treeAtom)
  const activeFile = useAtomValue(activeFileAtom)
  const diagnostics = useAtomValue(diagnosticsAtom)

  const openFile = useAtomSet(openFileAtom)
  const createFile = useAtomSet(createFileAtom)
  const createDirectory = useAtomSet(createDirectoryAtom)
  const renamePath = useAtomSet(renamePathAtom)
  const deletePath = useAtomSet(deletePathAtom)

  const [mode, setMode] = React.useState<ExplorerMode>({ _tag: "Idle" })
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const toggleDir = (dirPath: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(dirPath)) next.delete(dirPath)
      else next.add(dirPath)
      return next
    })
  }

  const expandDir = (dirPath: string) => {
    if (dirPath.length === 0) return
    setCollapsed((prev) => {
      if (!prev.has(dirPath)) return prev
      const next = new Set(prev)
      next.delete(dirPath)
      return next
    })
  }

  const startCreate = (kind: "file" | "directory", parentDir: string) => {
    expandDir(parentDir)
    setMode({ _tag: "Creating", kind, parentDir })
  }

  const renderCreatingRow = (parentDir: string, depth: number) => {
    if (mode._tag !== "Creating" || mode.parentDir !== parentDir) {
      return null
    }
    return (
      <div
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="flex items-center gap-1.5 py-1 pr-2"
      >
        {mode.kind === "directory" ? (
          <Folder className="h-4 w-4 shrink-0 text-zinc-400" />
        ) : (
          <FileCode2 className="h-4 w-4 shrink-0 text-zinc-400" />
        )}
        <InlineNameInput
          initialValue=""
          placeholder={mode.kind === "directory" ? "folder-name" : "file-name"}
          onCancel={() => setMode({ _tag: "Idle" })}
          onSubmit={(name) => {
            const fullPath = joinPath(parentDir, name)
            setMode({ _tag: "Idle" })
            if (mode.kind === "directory") {
              createDirectory(fullPath)
            } else {
              createFile({ path: fullPath, content: "" })
            }
          }}
        />
      </div>
    )
  }

  const renderNodes = (
    nodes: ReadonlyArray<WorkspaceNode>,
    depth: number,
  ): React.ReactNode =>
    nodes.map((node) => {
      const isRenaming =
        mode._tag === "Renaming" && mode.targetPath === node.path
      const isConfirmingDelete =
        mode._tag === "ConfirmDelete" && mode.targetPath === node.path
      const locked = holdsProtectedFile(node)

      if (node._tag === "Directory") {
        const isCollapsed = collapsed.has(node.path)
        const dirDiag = isCollapsed
          ? summarizeSubtreeDiagnostics(node.path, diagnostics)
          : undefined

        return (
          <div key={node.path}>
            <div
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className="group flex items-center gap-1.5 py-1 pr-2 text-sm text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
            >
              <button
                type="button"
                onClick={() => toggleDir(node.path)}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                )}
                {isCollapsed ? (
                  <Folder className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                ) : (
                  <FolderOpen className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                )}
                {isRenaming ? null : (
                  <span className="truncate font-mono">{node.name}</span>
                )}
              </button>

              {isRenaming ? (
                <InlineNameInput
                  initialValue={node.name}
                  placeholder="folder-name"
                  onCancel={() => setMode({ _tag: "Idle" })}
                  onSubmit={(nextName) => {
                    const nextPath = joinPath(parentOf(node.path), nextName)
                    setMode({ _tag: "Idle" })
                    renamePath({ oldPath: node.path, newPath: nextPath })
                  }}
                />
              ) : isConfirmingDelete ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Confirm delete"
                    onClick={() => {
                      setMode({ _tag: "Idle" })
                      deletePath(node.path)
                    }}
                    className="rounded p-0.5 text-red-600 hover:bg-red-500/15 dark:text-red-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Cancel delete"
                    onClick={() => setMode({ _tag: "Idle" })}
                    className="rounded p-0.5 text-zinc-500 hover:bg-zinc-300/60 dark:hover:bg-zinc-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <DiagnosticDot summary={dirDiag} />
                  <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      title="New file"
                      onClick={(e) => {
                        e.stopPropagation()
                        startCreate("file", node.path)
                      }}
                      className="rounded p-0.5 text-zinc-500 hover:bg-zinc-300/60 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                    >
                      <FilePlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="New folder"
                      onClick={(e) => {
                        e.stopPropagation()
                        startCreate("directory", node.path)
                      }}
                      className="rounded p-0.5 text-zinc-500 hover:bg-zinc-300/60 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title={
                        locked
                          ? "Holds files that cannot be renamed"
                          : "Rename folder"
                      }
                      disabled={locked}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMode({
                          _tag: "Renaming",
                          targetPath: node.path,
                          currentName: node.name,
                        })
                      }}
                      className={`rounded p-0.5 text-zinc-500 hover:bg-zinc-300/60 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 ${LOCKED_BUTTON_CLASS}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title={
                        locked
                          ? "Holds files that cannot be deleted"
                          : "Delete folder"
                      }
                      disabled={locked}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMode({
                          _tag: "ConfirmDelete",
                          targetPath: node.path,
                        })
                      }}
                      className={`rounded p-0.5 text-zinc-500 hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 ${LOCKED_BUTTON_CLASS}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {!isCollapsed && (
              <div>
                {renderCreatingRow(node.path, depth + 1)}
                {renderNodes(node.children, depth + 1)}
              </div>
            )}
          </div>
        )
      }

      const isActive =
        Option.isSome(activeFile) && activeFile.value === node.path
      const fileDiag = diagnostics.get(node.path)

      return (
        <div
          key={node.path}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
          className={
            isActive
              ? "group flex items-center gap-1.5 bg-zinc-200/80 py-1 pr-2 text-sm font-medium text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
              : "group flex items-center gap-1.5 py-1 pr-2 text-sm text-zinc-700 hover:bg-zinc-200/50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
          }
        >
          {isRenaming ? (
            <>
              <FileCode2 className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
              <InlineNameInput
                initialValue={node.name}
                placeholder="file-name"
                onCancel={() => setMode({ _tag: "Idle" })}
                onSubmit={(nextName) => {
                  const nextPath = joinPath(parentOf(node.path), nextName)
                  setMode({ _tag: "Idle" })
                  renamePath({ oldPath: node.path, newPath: nextPath })
                }}
              />
            </>
          ) : (
            <>
              <button
                type="button"
                data-testid={`explorer-file-${node.path}`}
                onClick={() => openFile(node.path)}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                <FileCode2 className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
                <span className="truncate font-mono">{node.name}</span>
              </button>

              {isConfirmingDelete ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Confirm delete"
                    onClick={() => {
                      setMode({ _tag: "Idle" })
                      deletePath(node.path)
                    }}
                    className="rounded p-0.5 text-red-600 hover:bg-red-500/15 dark:text-red-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Cancel delete"
                    onClick={() => setMode({ _tag: "Idle" })}
                    className="rounded p-0.5 text-zinc-500 hover:bg-zinc-300/60 dark:hover:bg-zinc-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <DiagnosticDot summary={fileDiag} />
                  <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      title={
                        locked ? "This file cannot be renamed" : "Rename file"
                      }
                      disabled={locked}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMode({
                          _tag: "Renaming",
                          targetPath: node.path,
                          currentName: node.name,
                        })
                      }}
                      className={`rounded p-0.5 text-zinc-500 hover:bg-zinc-300/60 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 ${LOCKED_BUTTON_CLASS}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title={
                        locked ? "This file cannot be deleted" : "Delete file"
                      }
                      disabled={locked}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMode({
                          _tag: "ConfirmDelete",
                          targetPath: node.path,
                        })
                      }}
                      className={`rounded p-0.5 text-zinc-500 hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 ${LOCKED_BUTTON_CLASS}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )
    })

  return (
    <aside
      aria-label="Workspace files"
      data-testid="scratchpad-file-explorer"
      className="flex h-full w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
          Files
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="New file"
            data-testid="explorer-new-file"
            onClick={() => startCreate("file", "")}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="New folder"
            data-testid="explorer-new-folder"
            onClick={() => startCreate("directory", "")}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {renderCreatingRow("", 0)}
        {tree.length === 0 && mode._tag === "Idle" ? (
          <div className="px-3 py-4 text-sm text-zinc-500 dark:text-zinc-500">
            No files yet.
          </div>
        ) : (
          renderNodes(tree, 0)
        )}
      </div>
    </aside>
  )
}
