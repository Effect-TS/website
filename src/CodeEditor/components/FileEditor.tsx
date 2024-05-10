import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import clsx from "clsx"
import { Option } from "effect"
import { useEffect, useMemo, useRef } from "react"
import { LoadingSpinner } from "../../components/LoadingSpinner"
import { useWorkspace } from "../context/WorkspaceContext"
import { editorRx } from "../rx/editor"

export function FileEditor() {
  const workspace = useWorkspace()
  const containerRef = useRef<HTMLDivElement>(null)
  const rx = useMemo(() => editorRx(workspace), [workspace])
  const setElement = useRxSet(rx.element)
  const editor = useRxValue(rx.editor)

  useEffect(() => {
    if (containerRef.current) {
      setElement(Option.some(containerRef.current))
    }
  }, [containerRef, setElement])

  const isReady = editor._tag === "Success"

  return (
    <section className="h-full flex flex-col">
      {!isReady && <LoadingSpinner />}
      <div
        ref={containerRef}
        className={clsx("h-full", !isReady && "hidden")}
      />
    </section>
  )
}
