"use client"

import * as React from "react"
import { WebContainer } from "@webcontainer/api"

enum WebContainerState {
  None,
  Booting,
  Ready
}

const WebContainerContext = React.createContext<WebContainer | null>(null)


const crossOriginIsolatedErrorMessage = `Failed to execute 'postMessage' on 'Worker': SharedArrayBuffer transfer requires self.crossOriginIsolated.`

export const WebContainerProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [webContainer, setWebContainer] = React.useState<WebContainer | null>(null)
  const webContainerStatus = React.useRef<WebContainerState>(WebContainerState.None)

  const isReady = webContainerStatus.current === WebContainerState.Ready

  React.useEffect(() => {
    if (webContainerStatus.current === WebContainerState.None) {
      webContainerStatus.current = WebContainerState.Booting
      WebContainer.boot()
        .then((webContainer) => {
          setWebContainer(webContainer)
          webContainerStatus.current = WebContainerState.Ready
        })
        .catch((error) => {
          if (error instanceof Error && error.message === crossOriginIsolatedErrorMessage) {
            error.message += "\n\n" +
              "See https://webcontainers.io/guides/quickstart#cross-origin-isolation for more information." +
              "\nTo fix this error, please set the following headers in your server:" +
              "\nCross-Origin-Embedder-Policy: require-corp" +
              "\nCross-Origin-Opener-Policy: same-origin"
            throw error
          }
        })
    }
    return () => {
      if (isReady) {
        webContainer?.teardown()
        webContainerStatus.current = WebContainerState.None
      }
    }
  }, [isReady, webContainer])

  return (
    <WebContainerContext.Provider value={webContainer}>
      {children}
    </WebContainerContext.Provider>
  )
}

export const useWebContainer = () => React.useContext(WebContainerContext)