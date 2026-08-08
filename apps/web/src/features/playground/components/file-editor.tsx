import { useAtomMount, useAtomSet } from "@effect/atom-react"
import { constVoid } from "effect/Function"
import * as Option from "effect/Option"
import { useCallback, useMemo } from "react"
import { editorAtom } from "../atoms/editor"
import { useWorkspaceHandle } from "../context/workspace"
import { ResetButton } from "./reset-button"
import { ShareButton } from "./share-button"

export function FileEditor() {
  const handle = useWorkspaceHandle()

  const atom = editorAtom(handle)
  useMemo(constVoid, [atom])
  useAtomMount(atom.editor)

  const setElement = useAtomSet(atom.element)

  const containerRef = useCallback(
    (node: HTMLDivElement) => {
      setElement(Option.some(node))
    },
    [setElement],
  )

  return (
    <section className="relative h-full">
      <div ref={containerRef} className="h-full" />
      <div className="absolute top-2 right-6 z-10 flex gap-2">
        <ResetButton />
        <ShareButton />
      </div>
    </section>
  )
}
