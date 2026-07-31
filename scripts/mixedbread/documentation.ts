import * as Schema from "effect/Schema"
import GithubSlugger from "github-slugger"
import matter from "gray-matter"

const Frontmatter = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String),
  draft: Schema.optional(Schema.Boolean),
  sidebar: Schema.optional(
    Schema.Struct({
      label: Schema.optional(Schema.String),
    }),
  ),
})

interface Section {
  readonly level: 1 | 2 | 3
  readonly title: string
  readonly anchor: string
  readonly body: string
}

export interface DocumentationChunk {
  readonly type: "text"
  readonly text: string
  readonly mime_type: "text/plain"
  readonly generated_metadata: {
    readonly type: "text"
    readonly docs_version: string
    readonly group_label: string
    readonly page_href: string
    readonly page_label: string
    readonly page_title: string
    readonly parent_section_anchor: string
    readonly parent_section_excerpt: string
    readonly parent_section_title: string
    readonly section_anchor: string
    readonly section_excerpt: string
    readonly section_level: 1 | 2 | 3
    readonly section_title: string
  }
}

export interface DocumentationDocument {
  readonly chunks: ReadonlyArray<DocumentationChunk>
  readonly metadata: Readonly<Record<string, string>>
}

const MAX_CHUNK_LENGTH = 8_000

export function makeDocument(
  source: string,
  relativePath: string,
): DocumentationDocument | undefined {
  const parsed = matter(source)
  const frontmatter = Schema.decodeUnknownSync(Frontmatter)(parsed.data)
  if (frontmatter.draft === true) {
    return undefined
  }

  const pathParts = relativePath
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/, "")
    .split("/")
  const docsVersion = pathParts[0] ?? "unknown"
  const group = pathParts.length > 2 ? (pathParts[1] ?? "") : ""
  const groupLabel = titleCase(group)
  const pageLabel = frontmatter.sidebar?.label ?? frontmatter.title
  const routePath = pathParts.join("/").replace(/(^|\/)index$/, "")
  const pageHref = `/docs/${routePath}`.replace(/\/+$/, "/")
  const sections = parseSections(parsed.content, frontmatter.title)
  const h2Sections = new Map(
    sections.filter((section) => section.level === 2).map((section) => [section.anchor, section]),
  )

  let currentParent: Section | undefined
  const chunks = sections.flatMap((section) => {
    if (section.level === 2) currentParent = section
    const parent = section.level === 3 ? currentParent : section
    const resolvedParent =
      parent?.level === 2 ? (h2Sections.get(parent.anchor) ?? parent) : (parent ?? section)
    const sectionExcerpt = excerpt(section.body)
    const parentExcerpt = excerpt(resolvedParent.body)
    const textParts = [
      `${groupLabel}${groupLabel.length > 0 ? " / " : ""}${pageLabel}`,
      `# ${resolvedParent.title}`,
      parentExcerpt,
      section.title === resolvedParent.title ? "" : `## ${section.title}`,
      section.body.trim(),
    ].filter((part) => part.length > 0)

    return splitText(textParts.join("\n\n")).map(
      (text): DocumentationChunk => ({
        type: "text",
        text,
        mime_type: "text/plain",
        generated_metadata: {
          type: "text",
          docs_version: docsVersion,
          group_label: groupLabel,
          page_href: pageHref,
          page_label: pageLabel,
          page_title: frontmatter.title,
          parent_section_anchor: resolvedParent.anchor,
          parent_section_excerpt: parentExcerpt,
          parent_section_title: resolvedParent.title,
          section_anchor: section.anchor,
          section_excerpt: sectionExcerpt,
          section_level: section.level,
          section_title: section.title,
        },
      }),
    )
  })

  return {
    chunks,
    metadata: {
      content_source: "documentation",
      docs_version: docsVersion,
      group_label: groupLabel,
      page_href: pageHref,
      page_label: pageLabel,
      page_title: frontmatter.title,
    },
  }
}

function parseSections(content: string, pageTitle: string): ReadonlyArray<Section> {
  const slugger = new GithubSlugger()
  const sections: Array<Section> = []
  let current: Section = { level: 1, title: pageTitle, anchor: "", body: "" }
  let fence: "`" | "~" | undefined

  const flush = () => {
    if (current.body.trim().length > 0 || current.level !== 1) sections.push(current)
  }

  for (const line of content.split("\n")) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line)
    if (fenceMatch !== null) {
      const marker = fenceMatch[1]?.charAt(0)
      if (marker === "`" || marker === "~") fence = fence === marker ? undefined : (fence ?? marker)
      current = { ...current, body: `${current.body}${line}\n` }
      continue
    }

    const heading = fence === undefined ? /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line) : null
    if (heading === null) {
      current = { ...current, body: `${current.body}${line}\n` }
      continue
    }

    const title = plainHeading(heading[2] ?? "")
    const anchor = slugger.slug(title)
    const level = heading[1]?.length
    if (level !== 2 && level !== 3) {
      current = { ...current, body: `${current.body}${line}\n` }
      continue
    }

    flush()
    current = { level, title, anchor, body: "" }
  }

  flush()
  return sections.length > 0
    ? sections
    : [{ level: 1, title: pageTitle, anchor: "", body: content }]
}

function plainHeading(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?(?:\[([^\]]+)\])\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim()
}

function excerpt(value: string): string {
  const text = value
    .replace(/^import\s+.*$/gm, "")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?(?:\[([^\]]+)\])\([^)]+\)/g, "$1")
    .replace(/[*_>#|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return text.length <= 240 ? text : `${text.slice(0, 237).trimEnd()}...`
}

function splitText(value: string): ReadonlyArray<string> {
  if (value.length <= MAX_CHUNK_LENGTH) return [value]
  const chunks: Array<string> = []
  let remainder = value
  while (remainder.length > MAX_CHUNK_LENGTH) {
    const splitAt = Math.max(remainder.lastIndexOf("\n", MAX_CHUNK_LENGTH), MAX_CHUNK_LENGTH / 2)
    chunks.push(remainder.slice(0, splitAt).trim())
    remainder = remainder.slice(splitAt).trim()
  }
  if (remainder.length > 0) chunks.push(remainder)
  return chunks
}

function titleCase(value: string): string {
  return value
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}
