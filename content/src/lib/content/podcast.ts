import { getCollection, type CollectionEntry } from "astro:content"
import type { Podcast } from "../schema/podcast";

export interface PodcastCollectionEntry {
  body: string
  collection: string
  data: Podcast & CollectionEntry<"docs">["data"]
  id: string
  render: () => Promise<{
    Content: import('astro').MarkdownInstance<object>['Content']
  }>
  slug: string
}

export async function getPodcastEntries() {
  const docEntries = await getCollection("docs")
  const podcastEntries: Array<PodcastCollectionEntry> = []

  for (const entry of docEntries) {
    if (entry.id.startsWith("podcast/")) {
      podcastEntries.push(entry as PodcastCollectionEntry)
    }
  }

  return podcastEntries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

