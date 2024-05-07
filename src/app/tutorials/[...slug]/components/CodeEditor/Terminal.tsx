import { Result, useRxValue } from "@effect-rx/rx-react"
import React, { useEffect, useRef } from "react"
import "@xterm/xterm/css/xterm.css"
import "./Terminal.css"
import { useWorkspace } from "../../context/workspace"

export function Terminal() {
  const terminal = useRxValue(useWorkspace().terminal)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (Result.isSuccess(terminal)) {
      terminal.value.open(ref.current!)
    }
  }, [terminal])

  return <div ref={ref} id="terminal" className="h-full w-full bg-black" />
}
