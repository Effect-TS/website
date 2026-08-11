import type { CollectionEntry } from "astro:content"
import { getCollection } from "astro:content"

export type DocsFamily = "tutorial" | "how-to" | "reference" | "explanation"

export function getDocsFamily(
  entry: CollectionEntry<"docs">,
): DocsFamily | undefined {
  return entry.data.diataxis
}

function entryPath(entry: CollectionEntry<"docs">): string {
  return `/docs/${entry.id.replace(/\/index$/, "")}`
}

let docsFamiliesByPath: Promise<ReadonlyMap<string, DocsFamily>> | undefined

export function getDocsFamiliesByPath(): Promise<
  ReadonlyMap<string, DocsFamily>
> {
  docsFamiliesByPath ??= getCollection("docs").then((entries) => {
    const families = new Map<string, DocsFamily>()

    for (const entry of entries) {
      const family = getDocsFamily(entry)
      if (family !== undefined) {
        families.set(entryPath(entry), family)
      }
    }

    return families
  })
  return docsFamiliesByPath
}
