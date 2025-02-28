import { defineRouteMiddleware } from "@astrojs/starlight/route-data"
import type { PodcastData } from "./data"
import { getPodcastEntries } from "@/lib/content/podcast"

export const onRequest = defineRouteMiddleware(async (context) => {
  context.locals.effectPodcast = await getPodcastData()
})

async function getPodcastData(): Promise<PodcastData> {
  return {
    episodes: await getPodcastEpisodesData()
  }
}

async function getPodcastEpisodesData(): Promise<PodcastData["episodes"]> {
  const entries = await getPodcastEntries()
  return entries.map((entry) => ({
    title: entry.data.title,
    description: entry.data.description,
    episodeNumber: entry.data.podcast.episodeNumber,
    publicationDate: entry.data.podcast.publicationDate,
    image: entry.data.podcast.image,
    duration: entry.data.podcast.duration,
    transcript: entry.data.podcast.transcript,
    enclosure: entry.data.podcast.enclosure,
    youtube: entry.data.podcast.youtube,
    tags: entry.data.podcast.tags
  }))
}
