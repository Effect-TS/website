import type { SearchSection } from "@website/domain/SearchMetadata"
import { MAX_MARKDOWN_CHUNK_LENGTH } from "./Config.ts"
import { splitText } from "./ChunkFiles.ts"
import { type ParsedMarkdown, sections } from "./Markdown.ts"

export interface MarkdownChunk {
  readonly text: string
  /** The heading the chunk sits under: the page itself, an h2 or an h3. */
  readonly section: SearchSection
  /** The h2 the section belongs to, or the page itself. */
  readonly parent: SearchSection
}

interface Segment {
  readonly section: SearchSection
  readonly text: string
}

const IMPORT_OR_EXPORT = /^(?:import|export)\s/

/** Source lines without MDX imports, and without frontmatter or heading ids. */
function cleanLines(lines: ReadonlyArray<string>): string {
  let fence = false
  const kept: Array<string> = []
  for (const line of lines) {
    if (/^\s*(?:```|~~~)/.test(line)) fence = !fence
    if (!fence && IMPORT_OR_EXPORT.test(line)) continue
    kept.push(line)
  }
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Split a page into chunks that each sit under one heading. A chunk starts
 * with the page title and context lines, so it still says where it comes from
 * once a search returns it alone. The first chunk is a page overview: title,
 * description and the list of sections.
 */
export function markdownChunks(
  source: string,
  parsed: ParsedMarkdown,
  page: {
    readonly title: string
    readonly description: string | undefined
    readonly context: string
  },
): Array<MarkdownChunk> {
  const outline = sections(parsed.tree, page.title, page.description)
  const root = outline[0]
  if (root === undefined) return []
  const bodyStart = parsed.yaml.position?.end.line ?? 0
  const lines = source.split("\n")
  const headings = outline.filter(
    ({ level, line }) => level >= 2 && level <= 3 && line > bodyStart,
  )
  const header = `# ${page.title}\n${page.context}\n\n`
  const room = MAX_MARKDOWN_CHUNK_LENGTH - header.length

  const segments: Array<Segment> = []
  const bounds = [
    { section: root, line: bodyStart + 1 },
    ...headings.map((section) => ({ section, line: section.line })),
  ]
  bounds.forEach(({ section, line }, index) => {
    const end = bounds[index + 1]?.line ?? lines.length + 1
    const text = cleanLines(lines.slice(line - 1, end - 1))
    if (text !== "") segments.push({ section, text })
  })

  const parentOf = (section: SearchSection): SearchSection =>
    section.level === 3
      ? (outline.find(
          ({ level, anchor }) =>
            level === 2 && anchor === section.parent_anchor,
        ) ?? root)
      : section.level === 2
        ? section
        : root

  // An h2 and its h3s share one chunk when they fit, and are packed otherwise.
  const units: Array<Segment> = []
  const groups = Map.groupBy(segments, ({ section }) =>
    section.level === 3 ? parentOf(section).anchor : section.anchor,
  )
  for (const group of groups.values()) {
    const [first] = group
    if (first === undefined) continue
    const joined = group.map(({ text }) => text).join("\n\n")
    if (joined.length <= room) {
      units.push({ section: first.section, text: joined })
      continue
    }
    let pending: Segment | undefined
    const flush = () => {
      if (pending !== undefined) units.push(pending)
      pending = undefined
    }
    for (const segment of group) {
      if (segment.text.length > room) {
        flush()
        for (const part of splitText(segment.text, room)) {
          units.push({ section: segment.section, text: part })
        }
        continue
      }
      if (
        pending !== undefined &&
        pending.text.length + 2 + segment.text.length > room
      ) {
        flush()
      }
      pending =
        pending === undefined
          ? segment
          : { ...pending, text: `${pending.text}\n\n${segment.text}` }
    }
    flush()
  }

  const overview = [
    header.trimEnd(),
    ...(page.description === undefined ? [] : ["", page.description]),
    ...(headings.length === 0
      ? []
      : ["", "Sections:", ...headings.map(({ title }) => `- ${title}`)]),
  ]
    .join("\n")
    .slice(0, MAX_MARKDOWN_CHUNK_LENGTH)

  return [
    { text: overview, section: root, parent: root },
    ...units.map(({ section, text }) => ({
      text: `${header}${text}`,
      section,
      parent: parentOf(section),
    })),
  ]
}
