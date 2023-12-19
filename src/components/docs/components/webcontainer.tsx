"use client"

import * as React from "react"
import { WebContainer } from "@webcontainer/api"

const WebContainerContext = React.createContext<WebContainer | null>(null)

export const useWebContainer = () => React.useContext(WebContainerContext)

export const WebContainerProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [webContainer, setWebContainer] = React.useState<WebContainer | null>(null)

  React.useEffect(() => {
    if (webContainer === null) {
      WebContainer.boot().then((container) => {
        setWebContainer(container)
      }).catch(console.log)
    }
  }, [webContainer])

  return (
  <WebContainerContext.Provider value={webContainer}>
    {children}
  </WebContainerContext.Provider>
  )
}
