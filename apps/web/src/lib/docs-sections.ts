import {
  getCollection,
  getEntries,
  getEntry,
  type CollectionEntry,
} from "astro:content"

export type DocsNavSection = "onboarding" | "guides" | "api"

export type DocsSidebarItem =
  | { readonly kind: "entry"; readonly entry: CollectionEntry<"docs"> }
  | {
      readonly kind: "group"
      readonly label: string
      readonly open: boolean
      readonly entries: ReadonlyArray<CollectionEntry<"docs">>
    }

const entryLabel = (entry: CollectionEntry<"docs">): string =>
  entry.data.sidebar?.label ?? entry.data.title
const entryOrder = (entry: CollectionEntry<"docs">): number =>
  entry.data.sidebar?.order ?? Infinity
const titleCase = (segment: string): string =>
  segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

const onboardingConfig = async (version: string) =>
  (await getEntry("docsOnboarding", version))?.data ?? []

// Guides = every doc the version's onboarding config does not claim. Directories
// become groups (ordered by the docsSidebar config), single-segment docs stay
// top-level, and the two interleave by order.
async function guidesItems(
  version: string,
  currentId: string,
): Promise<DocsSidebarItem[]> {
  const onboardingIds = new Set(
    (await onboardingConfig(version)).flatMap((group) =>
      group.items.map((ref) => ref.id),
    ),
  )
  const groupOrders = (await getEntry("docsSidebar", version))?.data ?? {}
  const byOrder = (
    a: CollectionEntry<"docs">,
    b: CollectionEntry<"docs">,
  ): number =>
    entryOrder(a) - entryOrder(b) || entryLabel(a).localeCompare(entryLabel(b))

  const roots: CollectionEntry<"docs">[] = []
  const byDir = new Map<string, CollectionEntry<"docs">[]>()
  for (const entry of await getCollection("docs")) {
    if (!entry.id.startsWith(`${version}/`) || onboardingIds.has(entry.id))
      continue
    const [dir, ...rest] = entry.id.slice(version.length + 1).split("/")
    if (dir === undefined) continue
    if (rest.length === 0) {
      roots.push(entry)
    } else {
      const bucket = byDir.get(dir)
      if (bucket) bucket.push(entry)
      else byDir.set(dir, [entry])
    }
  }

  const ranked = [
    ...roots.map((entry) => ({
      item: { kind: "entry" as const, entry },
      order: entryOrder(entry),
      label: entryLabel(entry),
    })),
    ...[...byDir].map(([dir, docs]) => {
      const entries = [...docs].sort(byOrder)
      const label = titleCase(dir)
      const item = {
        kind: "group" as const,
        label,
        open: entries.some((e) => e.id === currentId),
        entries,
      }
      return {
        item,
        order: groupOrders[dir] ?? Math.min(...entries.map(entryOrder)),
        label,
      }
    }),
  ]

  return ranked
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((r) => r.item)
}

// The full sidebar for a docs page: onboarding groups, or the directory-derived
// guides tree.
export async function buildDocsSidebar(
  version: string,
  currentId: string,
): Promise<{
  readonly section: DocsNavSection
  readonly items: DocsSidebarItem[]
}> {
  const config = await onboardingConfig(version)
  const isOnboarding = config.some((group) =>
    group.items.some((ref) => ref.id === currentId),
  )

  if (!isOnboarding) {
    return { section: "guides", items: await guidesItems(version, currentId) }
  }

  const groups = await Promise.all(
    config.map(async (group): Promise<DocsSidebarItem> => {
      const entries = await getEntries(group.items)
      return {
        kind: "group",
        label: group.label,
        open: entries.some((e) => e.id === currentId),
        entries,
      }
    }),
  )
  return { section: "onboarding", items: groups }
}
