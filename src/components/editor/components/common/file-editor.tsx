import React, { useEffect, useMemo, useRef } from "react"
import { useWorkspace } from "@/components/editor/context/workspace"
import { editorRx } from "@/components/editor/rx/editor"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"
import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import * as Option from "effect/Option"

export declare namespace FileEditor {
  export interface Props {}
}

export const FileEditor: React.FC<FileEditor.Props> = () => {
  const workspace = useWorkspace()
  const containerRef = useRef<HTMLDivElement>(null)
  const rx = useMemo(() => editorRx(workspace), [workspace])
  const setElement = useRxSet(rx.element)
  const isReady = useRxValue(rx.editor, (_) => _._tag === "Success")

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

FileEditor.displayName = "FileEditor"
