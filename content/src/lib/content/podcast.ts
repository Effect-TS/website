import { getCollection, type CollectionEntry } from "astro:content"
import type { Podcast } from "../schema/podcast";

export interface PodcastCollectionEntry {
  id: string
  body: string
  collection: string
  data: Podcast & CollectionEntry<"docs">["data"]
  render: () => Promise<{
    Content: import('astro').MarkdownInstance<object>['Content']
  }>
}

export async function getPodcastEntries() {
  const docEntries = await getCollection("docs")
  const podcastEntries: Array<PodcastCollectionEntry> = []

  for (const entry of docEntries) {
    if (entry.id.startsWith("podcast/")) {
      podcastEntries.push(entry as PodcastCollectionEntry)
    }
  }

  return podcastEntries.sort((a, b) => b.data.publicationDate.getTime() - a.data.publicationDate.getTime())
}

