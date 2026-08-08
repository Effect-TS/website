import {
  useAtom,
  useAtomSet,
  useAtomSuspense,
  useAtomValue,
} from "@effect/atom-react"
import * as React from "react"
import type { EmbedManager } from "./service"
import { embedManagerAtom, EmbedManagerAtomParams } from "./atoms"
import { EmbedCommand, type YouTubeVideo } from "./domain"

export interface YouTubeEmbedContext {
  readonly debug: boolean
  readonly manager: EmbedManager["Service"]
  readonly video: YouTubeVideo
}

export const YouTubeEmbedContext = React.createContext<YouTubeEmbedContext>(
  null as any,
)

export const useEmbedContext = () => React.useContext(YouTubeEmbedContext)

export const useEmbedManager = () => useEmbedContext().manager

export const useEmbedVideo = () => useEmbedContext().video

export const useEmbedDebug = () => useEmbedContext().debug

export const useEmbedDebugInfo = () => useAtomValue(useEmbedManager().debugAtom)

export const useEmbedConnect = () => useAtomSet(useEmbedManager().connect)

export const useEmbedState = () => useAtomValue(useEmbedManager().stateAtom)

export const useEmbedPreview = () => useAtom(useEmbedManager().previewAtom)

export const useSetEmbedPreview = () =>
  useAtomSet(useEmbedManager().previewAtom)

export const useEmbedControls = () => {
  const manager = useEmbedManager()
  const dispatch = useAtomSet(manager.stateAtom)
  return {
    play() {
      dispatch(new EmbedCommand.cases.playVideo())
    },
    pause() {
      dispatch(new EmbedCommand.cases.pauseVideo())
    },
    seekTo(seconds: number) {
      dispatch(new EmbedCommand.cases.seekTo({ args: [seconds, true] }))
    },
  } as const
}

export function YouTubeEmbedProvider({
  children,
  debug = false,
  video,
}: React.PropsWithChildren<{
  readonly debug?: boolean | undefined
  readonly video: YouTubeVideo
}>) {
  const managerAtom = React.useMemo(() => {
    const params = new EmbedManagerAtomParams({ video, options: { debug } })
    return embedManagerAtom(params)
  }, [debug, video])

  const manager = useAtomSuspense(managerAtom).value

  return (
    <YouTubeEmbedContext.Provider value={{ debug, manager, video }}>
      {children}
    </YouTubeEmbedContext.Provider>
  )
}
