import { FileIcon, FolderIcon } from "lucide-react"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { Workspace } from "../../domain/workspace"
import { State, useExplorerDispatch } from "../file-explorer"

export function FileInput({
  depth,
  type,
  onSubmit,
  initialValue = "",
  finalFocus,
}: {
  readonly depth: number
  readonly type: Workspace.FileType
  readonly initialValue?: string
  readonly onSubmit: (path: string) => void
  readonly finalFocus?: React.RefObject<HTMLButtonElement | null>
}) {
  const dispatch = useExplorerDispatch()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState(initialValue)

  useEffect(() => {
    const previous = document.activeElement
    const field = inputRef.current
    field?.focus()
    return () => {
      const target = finalFocus?.current ?? previous
      if (
        (document.activeElement === document.body ||
          document.activeElement === field) &&
        target instanceof HTMLElement &&
        target.isConnected
      )
        target.focus({ preventScroll: true })
    }
  }, [finalFocus])

  const paddingLeft = depth * 12 + 6
  const styles = { paddingLeft: `${paddingLeft}px` }

  const handleChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (event) => setFileName(event.target.value),
    [setFileName],
  )

  const handleSubmit = useCallback<React.ChangeEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      setFileName("")
      onSubmit(fileName)
    },
    [fileName, onSubmit, setFileName],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(State.Idle())
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [dispatch])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        dispatch(State.Idle())
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [dispatch])

  return (
    <div
      style={styles}
      className="grid h-7 w-full grid-cols-[14px_16px_auto] items-center gap-1.5 pr-1"
    >
      <span className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {type === "File" ? (
        <FileIcon
          className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
          aria-hidden="true"
        />
      ) : (
        <FolderIcon
          className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
          aria-hidden="true"
        />
      )}
      <div>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            aria-label={type === "File" ? "File name" : "Folder name"}
            className="w-full rounded-sm border border-input bg-popover p-0 px-1 text-sm text-foreground"
            value={fileName}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
          />
        </form>
      </div>
    </div>
  )
}
