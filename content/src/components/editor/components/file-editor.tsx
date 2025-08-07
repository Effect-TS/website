import { useCallback, useMemo } from "react"
import { useAtomMount, useAtomSet } from "@effect-atom/atom-react"
import * as Option from "effect/Option"
import { useWorkspaceHandle } from "../context/workspace"
import { editorAtom } from "../atoms/editor"
import { ShareButton } from "./share-button"
import { constVoid } from "effect/Function"
import { ResetButton } from "./reset-button"

export function FileEditor() {
  const handle = useWorkspaceHandle()

  const atom = editorAtom(handle)
  useMemo(constVoid, [atom]) // keep the reference to the atom object
  useAtomMount(atom.editor)

  const setElement = useAtomSet(atom.element)

  const containerRef = useCallback(
    (node: HTMLDivElement) => {
      setElement(Option.some(node))
    },
    [setElement]
  )

  return (
    <section className="h-full relative">
      <div ref={containerRef} className="h-full"></div>
      <div className="absolute top-2 right-6 z-10 flex gap-2">
        <ResetButton />
        <ShareButton />
      </div>
    </section>
  )
}
