import * as React from "react"
import type { PodcastEpisode } from "./domain"

export interface PodcastContext {
  readonly episode: PodcastEpisode
}

export const PodcastContext = React.createContext<PodcastContext>(null as any)

export const usePodcastContext = () => React.useContext(PodcastContext)

export const usePodcastEpisode = () => usePodcastContext().episode

export function PodcastContextProvider({
  children,
  episode,
}: React.PropsWithChildren<{
  readonly episode: PodcastEpisode
}>) {
  return (
    <PodcastContext.Provider value={{ episode }}>
      {children}
    </PodcastContext.Provider>
  )
}
