import { getEntries, getEntry, type CollectionEntry } from "astro:content"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { buildDocsSidebar } from "@/lib/docs-sections"
import { LlmsContent, type Doc, type DocGroup } from "./content"
import { LlmsContentError } from "./domain"

type Entry = CollectionEntry<"docs">

const toGroup = (label: string, entries: ReadonlyArray<Entry>): DocGroup => ({
  label,
  docs: entries
    .filter((entry) => !entry.data.draft && !entry.data.sidebar?.hidden)
    .map((entry): Doc => ({
      id: entry.id,
      title: entry.data.title,
      description: entry.data.description,
      body: entry.body ?? "",
    })),
})

// Onboarding groups first, then the sidebar's guides: top-level docs together
// as "Guides", followed by one group per directory.
const loadDocGroups = async (version: string): Promise<Array<DocGroup>> => {
  const onboarding = (await getEntry("docsOnboarding", version))?.data ?? []
  const onboardingGroups = await Promise.all(
    onboarding.map(async (group) =>
      toGroup(group.label, await getEntries(group.items)),
    ),
  )
  const { items } = await buildDocsSidebar(version, "")
  return [
    ...onboardingGroups,
    toGroup(
      "Guides",
      items.flatMap((item) => (item.kind === "entry" ? [item.entry] : [])),
    ),
    ...items.flatMap((item) =>
      item.kind === "group" ? [toGroup(item.label, item.entries)] : [],
    ),
  ]
}

export const layer = Layer.succeed(LlmsContent, {
  docGroups: Effect.fn("LlmsContent.docGroups")((version: string) =>
    Effect.tryPromise({
      try: () => loadDocGroups(version),
      catch: (cause) => new LlmsContentError({ cause }),
    }),
  ),
})
