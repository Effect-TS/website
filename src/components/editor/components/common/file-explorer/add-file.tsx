import React, { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { useClickOutside } from "@/hooks/useClickOutside"
import {
  Action,
  useExplorerDispatch,
} from "../file-explorer"
import { cn } from "@/lib/utils"

export function AddFile({
  depth,
  path,
  type
}: {
  readonly depth: number
  readonly path: string
  readonly type: "file" | "directory"
}) {
  const dispatch = useExplorerDispatch()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState("")

  const paddingLeft = 16 + depth + 1 * 8
  const styles = { paddingLeft: `${paddingLeft}px` }

  const handleChange = useCallback<
    React.ChangeEventHandler<HTMLInputElement>
  >((event) => setFileName(event.target.value), [setFileName])

  const handleSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      if (type === "file") {
        dispatch(Action.CreateFile({ fileName, path }))
      } else {
        dispatch(Action.CreateDirectory({ fileName, path }))
      }
      setFileName("")
    },
    [dispatch, fileName, setFileName, path, type]
  )

  // Close the input when the user clicks outside
  useClickOutside(inputRef, () => dispatch(Action.HideInput()))

  // Close the input when the user hits the escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(Action.HideInput())
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
          name={type === "file" ? "file" : "directory-closed"}
          className={cn(type === "directory" && "[&_path]:fill-none")}
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
