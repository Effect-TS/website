import { useCallback, useMemo } from "react"
import { useRxMount, useRxSet } from "@effect-rx/rx-react"
import * as Option from "effect/Option"
import { useWorkspaceHandle } from "../context/workspace"
import { editorRx } from "../rx/editor"
import { ShareButton } from "./share-button"
import { constVoid } from "effect/Function"
import { ResetButton } from "./reset-button"

export function FileEditor() {
  const handle = useWorkspaceHandle()

  const rx = editorRx(handle)
  useMemo(constVoid, [rx]) // keep the reference to the rx object
  useRxMount(rx.editor)

  const setElement = useRxSet(rx.element)

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
