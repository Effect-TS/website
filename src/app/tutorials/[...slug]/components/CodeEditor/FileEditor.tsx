import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import clsx from "clsx"
import { useEffect, useRef } from "react"
import { useWorkspace } from "../../context/workspace"
import { editorRx } from "../../rx/editor"

export function FileEditor() {
  const workspace = useWorkspace()
  const containerRef = useRef(null)
  const rx = editorRx(workspace)
  const setElement = useRxSet(rx.element)
  const editor = useRxValue(rx.editor)

  useEffect(() => {
    if (containerRef.current) {
      setElement(containerRef.current)
    }
  }, [containerRef, setElement])

  const isReady = editor._tag === "Success"

  return (
    <section className="h-full flex flex-col">
      {!isReady && (
        <div className="h-full flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-400" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      )}
      <div
        ref={containerRef}
        className={clsx("flex-grow w-full", !isReady && "hidden")}
      />
    </section>
  )
}
