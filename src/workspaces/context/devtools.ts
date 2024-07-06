import React from "react"
import { useRx, useRxSet, useRxValue } from "@effect-rx/rx-react"
import { RxDevTools } from "../rx/devtools"

export const DevToolsContext = React.createContext<RxDevTools>(null as any)

export const useDevTools = () => React.useContext(DevToolsContext)

export const useSelectedSpan = () => useRx(useDevTools().selectedSpan)

export const useSelectedSpanValue = () => useRxValue(useDevTools().selectedSpan)
export const useSetSelectedSpan = () => useRxSet(useDevTools().selectedSpan)

export const useSelectedSpanIndex = () =>
  useRxValue(useDevTools().selectedSpanIndex)
