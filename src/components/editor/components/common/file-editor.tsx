import React, { useEffect, useMemo, useRef } from "react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"
import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import * as Option from "effect/Option"
import { useWorkspaceHandle } from "@/workspaces/context/workspace"
import { editorRx } from "../../rx"

export function FileEditor() {
  const handle = useWorkspaceHandle()
  const containerRef = useRef<HTMLDivElement>(null)
  const rx = useMemo(() => editorRx(handle), [handle])
  const setElement = useRxSet(rx.element)
  const result = useRxValue(rx.editor)
  const isReady = result._tag === "Success"

  useEffect(() => {
    if (containerRef.current) {
      setElement(Option.some(containerRef.current))
    }
  }, [containerRef, setElement])

  return (
    <section className="h-full flex flex-col">
      {!isReady && <LoadingSpinner message="Loading editor..." />}
      <div
        ref={containerRef}
        className={cn("h-full", !isReady && "hidden")}
      />
    </section>
  )
}
