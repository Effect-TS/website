import React, { useCallback, useEffect, useRef, useState } from "react"
import { FileIcon, FolderIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useClickOutside } from "@/hooks/useClickOutside"
import { Workspace } from "../../domain/workspace"
import { State, useExplorerDispatch } from "../file-explorer"

export function FileInput({
  depth,
  type,
  onSubmit,
  initialValue = ""
}: {
  readonly depth: number
  readonly type: Workspace.FileType
  readonly initialValue?: string
  readonly onSubmit: (path: string) => void
}) {
  const dispatch = useExplorerDispatch()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState(initialValue)

  const paddingLeft = 16 + depth * 8
  const styles = { paddingLeft: `${paddingLeft}px` }

  const handleChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (event) => setFileName(event.target.value),
    [setFileName]
  )

  const handleSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      setFileName("")
      onSubmit(fileName)
    },
    [fileName, onSubmit, setFileName]
  )

  // Close the input when the user clicks outside
  useClickOutside(inputRef, () => dispatch(State.Idle()))

  // Close the input when the user hits the escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(State.Idle())
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [dispatch])

  return (
    <div style={styles} className="h-7 w-full pr-1 grid grid-cols-[16px_1fr] items-center gap-1">
      <div className="h-4 w-4">{type === "File" ? <FileIcon size={16} /> : <FolderIcon size={16} />}</div>
      <div>
        <form onSubmit={handleSubmit}>
          <Input
            ref={inputRef}
            type="text"
            className="w-full p-0 px-1 bg-[--sl-color-black] border-[--sl-color-text] rounded-sm"
            value={fileName}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            autoFocus
          />
        </form>
      </div>
    </div>
  )
}
