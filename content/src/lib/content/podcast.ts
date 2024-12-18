import { getCollection, type CollectionEntry } from "astro:content"
import type { Podcast } from "../schema/podcast"

export interface PodcastCollectionEntry {
  id: string
  body?: string
  collection: "docs"
  data: Podcast & CollectionEntry<"docs">["data"]
  rendered?: RenderedContent
  filePath?: string
}

export async function getPodcastEntries() {
  const docEntries = await getCollection("docs")
  const podcastEntries: Array<PodcastCollectionEntry> = []

  for (const entry of docEntries) {
    if (entry.id.startsWith("podcast/")) {
      podcastEntries.push(entry as PodcastCollectionEntry)
    }
  }

  return podcastEntries.sort((a, b) => {
    return (
      b.data.publicationDate.getTime() - a.data.publicationDate.getTime()
    )
  })
}
