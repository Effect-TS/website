import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import "@xterm/xterm/css/xterm.css"
import React, { useEffect, useRef } from "react"
import { useWorkspace } from "../context/WorkspaceContext"
import "./Terminal.css"

export declare namespace Terminal {
  export interface Props {}
}

export const Terminal: React.FC<Terminal.Props> = () => {
  const terminal = useRxSuspenseSuccess(useWorkspace().terminal).value
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    terminal.open(ref.current!)
  }, [terminal])

  return <div ref={ref} id="terminal" className="h-full w-full bg-black" />
}
