import React from "react"
import { useRxRef, useRxSet, useRxValue } from "@effect-rx/rx-react"
import { RxDevTools } from "../rx/devtools"

export const DevToolsContext = React.createContext<RxDevTools>(null as any)

export const useDevTools = () => React.useContext(DevToolsContext)

export const useSelectedSpanRef = () => useRxValue(useDevTools().selectedSpan)

export const useSelectedSpan = () => {
  const ref = useSelectedSpanRef()
  return useRxRef(ref)
}

export const useSetSelectedSpan = () => useRxSet(useDevTools().selectedSpan)

export const useSelectedSpanIndex = () =>
  useRxValue(useDevTools().selectedSpanIndex)
