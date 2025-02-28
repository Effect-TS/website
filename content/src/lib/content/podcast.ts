import { getCollection } from "astro:content"
import type { Podcast } from "../schema/podcast"
import type { StarlightEntry } from "../types/starlight"
import type { GetStaticPathsResult } from "node_modules/astro/dist/types/public"

export type PodcastEntry = StarlightEntry & {
  readonly data: {
    readonly podcast: Podcast
  }
}

export function isPodcastEntry(entry: StarlightEntry): entry is PodcastEntry {
  return "podcast" in entry.data
}

export async function getPodcastEntries() {
  const entries = await getCollection("docs", isPodcastEntry)
  return entries.sort((a, b) => {
    return b.data.podcast.publicationDate.getTime() - a.data.podcast.publicationDate.getTime()
  })
}

export async function getPodcastStaticPaths() {
  const entries = await getPodcastEntries()
  const episodes = entries
    .sort((a, b) => b.data.podcast.episodeNumber - a.data.podcast.episodeNumber)
    .slice(0, 3)
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      duration: entry.data.podcast.duration,
      url: `/podcast/episodes/${entry.id.replace("podcast/", "")}/`,
      episodeNumber: entry.data.podcast.episodeNumber,
      publicationDate: entry.data.podcast.publicationDate,
      youtube: entry.data.podcast.youtube
    }))
  return [{
    params: {
      prefix: "podcast"
    },
    props: {
      episodes
    }
  }] satisfies GetStaticPathsResult
}

export async function getPodcastEpisodeStaticPaths() {
  const entries = await getPodcastEntries()
  return entries.map((entry) => ({
    params: {
      prefix: "podcast",
      episode: entry.id.replace("podcast", "")
    },
    props: {
      entry,
      transcript: entry.data.podcast.transcript,
      title: entry.data.title,
      description: entry.data.description,
      url: `/podcast/episodes/${entry.id.replace("podcast/", "")}/`,
      episodeNumber: entry.data.podcast.episodeNumber,
      publicationDate: entry.data.podcast.publicationDate.toLocaleDateString(undefined, {
        dateStyle: "medium"
      }),
      youtube: entry.data.podcast.youtube
    }
  })) satisfies GetStaticPathsResult
}

