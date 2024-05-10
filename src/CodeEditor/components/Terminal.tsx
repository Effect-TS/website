import { useRxSuspenseSuccess } from "@effect-rx/rx-react"
import "@xterm/xterm/css/xterm.css"
import React, { useEffect, useRef } from "react"
import { useWorkspaceHandle } from "../context/WorkspaceContext"
import "./Terminal.css"

export function Terminal() {
  const terminal = useRxSuspenseSuccess(useWorkspaceHandle().terminal).value
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    terminal.open(ref.current!)
  }, [terminal])

  return <div ref={ref} id="terminal" className="h-full w-full bg-black" />
}
