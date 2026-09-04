import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react"
import { constVoid } from "effect/Function"
import * as Option from "effect/Option"
import { useCallback, useMemo } from "react"
import { editorAtom } from "../atoms/editor"
import { useWorkspaceHandle } from "../context/workspace"
import { ResetButton } from "./reset-button"
import { ShareButton } from "./share-button"
import { VersionToggle } from "./version-toggle"

export function FileEditor() {
  const handle = useWorkspaceHandle()

  const atom = editorAtom(handle)
  useMemo(constVoid, [atom])
  useAtomMount(atom.editor)

  const selectedPath = useAtomValue(handle.selectedPath)
  const setElement = useAtomSet(atom.element)

  const containerRef = useCallback(
    (node: HTMLDivElement) => {
      setElement(Option.some(node))
    },
    [setElement],
  )

  return (
    <section className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {selectedPath.slice(selectedPath.lastIndexOf("/") + 1)}
        </span>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <VersionToggle />
          <ResetButton />
          <ShareButton />
        </div>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </section>
  )
}
