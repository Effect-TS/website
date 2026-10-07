import type { DeepMutable } from "effect/Types"
import * as Schema from "effect/Schema"
import type { SearchResult, SearchResultChunk } from "./domain"
import {
  ApiReferenceGeneratedMetadata,
  ApiReferenceMetadata,
  BlogGeneratedMetadata,
  ChangelogGeneratedMetadata,
  ChangelogMetadata,
  DocumentationGeneratedMetadata,
  StoreSearchResponse,
} from "./domain"

export function extractSnippet(text: string, maxLength: number = 150): string {
  let cleaned = text
    .replace(/^import\s+.*$/gm, "")
    .replace(/<[A-Z][^>]*\/>/g, "")
    .replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/^\|.*\|$/gm, "")
    .replace(/^\|?[-:\s|]+\|?$/gm, "")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_]/g, "")
    .replace(/^---\n[\s\S]*?\n---\n?/m, "")
    .replace(/---\n[\s\S]*?\n---/g, "")
    .replace(/^\w+:\s*.*$/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (cleaned.length <= maxLength) {
    return cleaned
  }
  return cleaned.substring(0, maxLength).trim() + "..."
}

function markdownSection(
  generated:
    | typeof DocumentationGeneratedMetadata.Type
    | typeof BlogGeneratedMetadata.Type,
) {
  const firstHeading = generated.chunk_headings[0]
  const endLine = generated.start_line + generated.num_lines
  const chunkSection =
    firstHeading === undefined
      ? undefined
      : generated.search.sections.find(
          (section) =>
            section.line >= generated.start_line &&
            section.line <= endLine &&
            section.level === firstHeading.level &&
            section.title === firstHeading.text,
        )
  return (
    chunkSection ??
    generated.search.sections.findLast(
      (section) => section.line <= generated.start_line,
    ) ??
    generated.search.sections[0]
  )
}

type Grouped = Map<string, DeepMutable<SearchResult>>

/** The result listed under `href`, created on first sight. */
function resultFor<R extends DeepMutable<SearchResult>>(
  grouped: Grouped,
  kind: R["kind"],
  href: string,
  create: () => R,
): R | undefined {
  let result = grouped.get(href)
  if (result === undefined) {
    result = create()
    grouped.set(href, result)
  }
  return result.kind === kind ? (result as R) : undefined
}

/** Add a match to a result unless its link is already listed. */
function addChunk(
  result: { readonly chunks: Array<DeepMutable<SearchResultChunk>> },
  match: DeepMutable<SearchResultChunk>,
): void {
  if (result.chunks.some(({ href }) => href === match.href)) return
  result.chunks.push(match)
}

export function groupSearchResults(
  response: StoreSearchResponse,
): ReadonlyArray<SearchResult> {
  const grouped: Grouped = new Map()

  response.data.forEach((chunk) => {
    const id = `${chunk.file_id}-${chunk.chunk_index}`

    if (Schema.is(ApiReferenceMetadata)(chunk.metadata)) {
      const metadata = chunk.metadata
      const generated = chunk.generated_metadata
      if (!Schema.is(ApiReferenceGeneratedMetadata)(generated)) return
      const href = generated.module_href
      const page = resultFor(grouped, "api-reference", href, () => ({
        kind: "api-reference",
        id: `${metadata.api_version}/${metadata.package_slug}/${generated.module_path}`,
        description: `${metadata.package_name} / ${generated.module_path}`,
        title: generated.module_name,
        href,
        packageName: metadata.package_name,
        version: metadata.api_version,
        chunks: [],
      }))
      if (page === undefined) return
      addChunk(page, {
        id,
        detail: generated.signature || generated.declaration_kind,
        href: `${href}#${generated.declaration_anchor}`,
        title: generated.declaration_name,
        snippet: extractSnippet(chunk.text),
        score: chunk.score,
      })
      return
    }

    if (Schema.is(ChangelogMetadata)(chunk.metadata)) {
      const metadata = chunk.metadata
      const generated = chunk.generated_metadata
      if (!Schema.is(ChangelogGeneratedMetadata)(generated)) return
      const href = generated.page_href
      const page = resultFor(grouped, "changelog", href, () => ({
        kind: "changelog",
        id: href,
        title: `${metadata.package_name} changelog`,
        description: `Release notes for ${metadata.package_name}`,
        href,
        packageName: metadata.package_name,
        packageSlug: metadata.package_slug,
        version: metadata.channel,
        chunks: [],
      }))
      if (page === undefined) return
      addChunk(page, {
        id,
        href: `${href}#${generated.version}`,
        title: generated.version,
        snippet: extractSnippet(chunk.text).replace(/^-\s+/, ""),
        score: chunk.score,
      })
      return
    }

    const generated = chunk.generated_metadata
    if (Schema.is(BlogGeneratedMetadata)(generated)) {
      const href = generated.search.page_href
      const result = resultFor(grouped, "blog", href, () => ({
        kind: "blog",
        id: href,
        title: generated.search.page_title,
        description: generated.search.description,
        href,
        publishedAt: generated.search.published_at,
        authors: [...generated.search.authors],
        tags: [...generated.search.tags],
        chunks: [],
      }))
      if (result === undefined) return
      const section = markdownSection(generated)
      if (section === undefined || section.anchor.length === 0) return
      addChunk(result, {
        id,
        href: `${href}#${section.anchor}`,
        title: section.title,
        snippet: section.excerpt || extractSnippet(chunk.text),
        score: chunk.score,
      })
      return
    }

    if (!Schema.is(DocumentationGeneratedMetadata)(generated)) return
    const section = markdownSection(generated)
    if (section === undefined) return
    const parent =
      generated.search.sections.find(
        (candidate) => candidate.anchor === section.parent_anchor,
      ) ?? section

    const parentHref = parent.anchor
      ? `${generated.search.page_href}#${parent.anchor}`
      : generated.search.page_href
    const result = resultFor(grouped, "documentation", parentHref, () => ({
      kind: "documentation",
      id: parentHref,
      breadcrumbs: [...generated.search.breadcrumbs],
      description: parent.excerpt,
      title: parent.title,
      href: parentHref,
      version: generated.search.docs_version,
      chunks: [],
    }))
    if (result === undefined) return
    if (section.anchor === parent.anchor) return

    addChunk(result, {
      id,
      href: section.anchor
        ? `${generated.search.page_href}#${section.anchor}`
        : generated.search.page_href,
      title: section.title,
      snippet: section.excerpt || extractSnippet(chunk.text),
      score: chunk.score,
    })
  })

  return Array.from(grouped.values())
}
