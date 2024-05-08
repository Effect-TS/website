import { useRxSet, useRxValue } from "@effect-rx/rx-react"
import clsx from "clsx"
import { useEffect, useRef } from "react"
import { editorElementRx, editorRx } from "../../rx/editor"
import { LoadingSpinner } from "../LoadingSpinner"
import { Option } from "effect"

export declare namespace FileEditor {
  export interface Props {}
}

export const FileEditor: React.FC<FileEditor.Props> = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const setElement = useRxSet(editorElementRx)
  const editor = useRxValue(editorRx)

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
