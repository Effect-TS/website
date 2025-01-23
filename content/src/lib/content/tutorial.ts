import { getCollection, type CollectionEntry } from "astro:content"
import type { Tutorial } from "../schema/tutorial"

export interface TutorialCollectionEntry {
  body: string
  collection: string
  data: Tutorial & CollectionEntry<"docs">["data"]
  id: string
  render: () => Promise<{
    Content: import("astro").MarkdownInstance<object>["Content"]
  }>
  slug: string
}

export async function getTutorialEntries() {
  const docEntries = await getCollection("docs")
  const tutorialEntries: Array<TutorialCollectionEntry> = []

  for (const entry of docEntries) {
    if (entry.id.startsWith("learn/tutorials")) {
      tutorialEntries.push(entry as TutorialCollectionEntry)
    }
  }

  return tutorialEntries
}
