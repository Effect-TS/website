import * as React from "react"
import { YouTubeEmbed } from "@/features/youtube-embed"
import { PodcastChapters } from "./PodcastChapters"
import { PodcastGuestCard } from "./PodcastGuestCard"
import { PodcastTranscript } from "./PodcastTranscript"

export function PodcastEpisodeLayout({ children }: React.PropsWithChildren) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-4 lg:mb-0">
          <YouTubeEmbed />
        </div>
        <div className="mb-4 lg:hidden">
          <PodcastGuestCard />
        </div>
        <div className="mb-4 lg:hidden">
          <PodcastChapters />
        </div>
        <div className="mb-6 lg:hidden">
          <PodcastTranscript />
        </div>
        {children}
      </div>
      <aside className="top-20 col-span-1 hidden lg:sticky lg:flex lg:h-[calc(100svh-10rem)] lg:min-h-0 lg:flex-col lg:gap-4 lg:self-start lg:overflow-hidden">
        <PodcastGuestCard />
        <PodcastChapters />
        <PodcastTranscript />
      </aside>
    </div>
  )
}
