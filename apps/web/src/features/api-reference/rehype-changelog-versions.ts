import type { Element, ElementContent, Root } from "hast"

import { isSemver } from "@website/domain/Changelog"

// Minimal shape of the markdown vfile: Astro exposes the parsed frontmatter at
// `data.astro.frontmatter`.
interface MarkdownFile {
  readonly data: {
    readonly astro?: { readonly frontmatter?: Record<string, unknown> }
  }
}

/**
 * Decorate changelog version headings at build time. Reads the per-version
 * `versions` frontmatter (written by the api-reference generator) and appends a
 * "Breaking" badge and a formatted release `<time>` to each matching `## <semver>`
 * heading. The markdown processor is global (no per-collection rehype hook), so
 * this is scoped to the changelog collection by its frontmatter signature
 * (`channel` + `package` + `slug`) — a trio no other collection carries — and
 * no-ops on everything else.
 */
interface VersionMeta {
  readonly date: string | undefined
  readonly breaking: boolean
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

export function rehypeChangelogVersions() {
  return (tree: Root, file: MarkdownFile) => {
    const meta = readVersions(file)
    if (meta === undefined) return

    for (const node of tree.children) {
      if (node.type !== "element" || node.tagName !== "h2") continue
      const title = textContent(node.children).trim()
      if (!isSemver(title)) continue
      const version = meta.get(title)
      if (version === undefined) continue

      if (version.breaking) node.children.push(breakingBadge())
      if (version.date !== undefined) {
        node.children.push(dateBadge(version.date))
      }
    }
  }
}

function readVersions(
  file: MarkdownFile,
): Map<string, VersionMeta> | undefined {
  const frontmatter = file.data.astro?.frontmatter
  if (frontmatter === undefined || !isChangelogFrontmatter(frontmatter)) {
    return undefined
  }
  const versions = frontmatter.versions
  if (!Array.isArray(versions) || versions.length === 0) return undefined

  const map = new Map<string, VersionMeta>()
  for (const entry of versions) {
    if (typeof entry !== "object" || entry === null) continue
    const record = entry as Record<string, unknown>
    if (typeof record.version !== "string") continue
    map.set(record.version, {
      date: typeof record.date === "string" ? record.date : undefined,
      breaking: record.breaking === true,
    })
  }
  return map
}

// The changelog schema requires this trio (see `content.config.ts`); no other
// collection defines all three, so it identifies a changelog document.
function isChangelogFrontmatter(fm: Record<string, unknown>): boolean {
  return (
    typeof fm.package === "string" &&
    typeof fm.slug === "string" &&
    typeof fm.channel === "string" &&
    /^v\d+$/.test(fm.channel)
  )
}

function breakingBadge(): Element {
  return {
    type: "element",
    tagName: "span",
    properties: {
      className: ["changelog-badge", "changelog-badge-breaking"],
      title: "Breaking change",
    },
    children: [{ type: "text", value: "Breaking" }],
  }
}

function dateBadge(date: string): Element {
  return {
    type: "element",
    tagName: "time",
    properties: { className: ["changelog-date"], dateTime: date },
    children: [
      {
        type: "text",
        value: dateFormatter.format(new Date(`${date}T00:00:00Z`)),
      },
    ],
  }
}

function textContent(children: ReadonlyArray<ElementContent>): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value
      if (child.type === "element") return textContent(child.children)
      return ""
    })
    .join("")
}
