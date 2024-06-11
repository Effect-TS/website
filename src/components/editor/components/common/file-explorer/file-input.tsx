import React, { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { useClickOutside } from "@/hooks/useClickOutside"
import { cn } from "@/lib/utils"
import { FileExplorer, State, useExplorerDispatch } from "../file-explorer"

export function FileInput({
  depth,
  type,
  onSubmit,
  initialValue = ""
}: {
  readonly depth: number
  readonly type: FileExplorer.InputType
  readonly initialValue?: string
  readonly onSubmit: (path: string) => void
}) {
  const dispatch = useExplorerDispatch()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState(initialValue)

  const paddingLeft = 16 + depth * 8
  const styles = { paddingLeft: `${paddingLeft}px` }

  const handleChange = useCallback<
    React.ChangeEventHandler<HTMLInputElement>
  >((event) => setFileName(event.target.value), [setFileName])

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
    <div style={styles} className="flex items-center py-1">
      <span className="flex items-center h-4 w-4 mr-1">
        <Icon
          name={type === "File" ? "file" : "directory-closed"}
          className={cn(type === "Directory" && "[&_path]:fill-none")}
        />
      </span>
      <form className="grow mr-1" onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          className="h-6 p-0 rounded-none"
          value={fileName}
          onChange={handleChange}
          autoFocus
        />
      </form>
    </div>
  )
}
