import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as React from "react"
import { YouTubeEmbedProvider } from "@/features/youtube-embed"
import { PodcastEpisodeEntry } from "../collection"
import { PodcastContextProvider } from "../context"
import { type PodcastEpisode, PodcastEpisodeId, type SrtCue } from "../domain"
import {
  formatPodcastDuration,
  formatPodcastPublicationDate,
  normalizePodcastChapters,
  normalizePodcastTranscript,
} from "../utils"
import { PodcastEpisodeLayout } from "./PodcastEpisodeLayout"

export function PodcastEpisodeRoot({
  children,
  podcast,
  transcript,
}: React.PropsWithChildren<{
  readonly podcast: PodcastEpisodeEntry
  readonly transcript: ReadonlyArray<SrtCue>
}>) {
  const reactId = React.useId()

  const podcastEpisodeId = React.useMemo(
    () =>
      PodcastEpisodeId.make(
        `${podcast.youtubeId}-${reactId.replace(/:/g, "")}`,
        {
          disableChecks: true,
        },
      ),
    [podcast.youtubeId, reactId],
  )

  const podcastChapters = React.useMemo(
    () => normalizePodcastChapters(podcast.chapters),
    [podcast.chapters],
  )

  const podcastTranscript = React.useMemo(
    () => normalizePodcastTranscript(transcript),
    [transcript],
  )

  const episodeDuration = Duration.seconds(podcast.duration)
  const episodePublishedOn = DateTime.makeUnsafe(podcast.date)

  const podcastEpisode = {
    id: podcastEpisodeId,
    number: podcast.episodeNumber,
    title: podcast.title,
    guest: podcast.guest,
    company: podcast.company,
    chapters: podcastChapters,
    transcript: podcastTranscript,
    links: podcast.links,
    youtube: { id: podcast.youtubeId },
    duration: episodeDuration,
    publishedOn: episodePublishedOn,
    formattedDuration: formatPodcastDuration(episodeDuration),
    formattedPublicationDate: formatPodcastPublicationDate(episodePublishedOn),
  } as unknown as PodcastEpisode

  return (
    <YouTubeEmbedProvider
      video={{
        id: podcastEpisode.youtube.id,
        title: podcastEpisode.title,
      }}
    >
      <PodcastContextProvider episode={podcastEpisode}>
        <PodcastEpisodeLayout>{children}</PodcastEpisodeLayout>
      </PodcastContextProvider>
    </YouTubeEmbedProvider>
  )
}
