import type { DeepMutable } from "effect/Types"
import * as Schema from "effect/Schema"
import type { SearchResult, SearchResultChunk } from "./domain"
import {
  ApiReferenceGeneratedMetadata,
  ApiReferenceMetadata,
  BlogChunkMetadata,
  BlogMetadata,
  ChangelogGeneratedMetadata,
  ChangelogMetadata,
  DocumentationChunkMetadata,
  DocumentationMetadata,
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

type Grouped = Map<string, DeepMutable<SearchResult>>

// Packages released in lockstep repeat the same notes. Two chunks of one
// version with the same text are one set of notes.
const releaseNotesKey = (version: string, text: string): string =>
  `${version}\n${text
    .replace(/^# .*\n+/, "")
    .replace(/\s+/g, " ")
    .trim()}`

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
  const releaseNotes = new Map<string, DeepMutable<SearchResultChunk>>()

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
      const notesKey = releaseNotesKey(generated.version, chunk.text)
      const sameNotes = releaseNotes.get(notesKey)
      if (sameNotes !== undefined) {
        const others = (sameNotes.alsoIn ??= [])
        if (!others.some(({ slug }) => slug === metadata.package_slug)) {
          others.push({
            name: metadata.package_name,
            slug: metadata.package_slug,
          })
        }
        return
      }
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
      const match: DeepMutable<SearchResultChunk> = {
        id,
        href: `${href}#${generated.version}`,
        title: generated.version,
        snippet: extractSnippet(chunk.text).replace(/^-\s+/, ""),
        score: chunk.score,
      }
      addChunk(page, match)
      releaseNotes.set(notesKey, match)
      return
    }

    if (Schema.is(BlogMetadata)(chunk.metadata)) {
      const generated = chunk.generated_metadata
      if (!Schema.is(BlogChunkMetadata)(generated)) return
      const href = generated.page_href
      const result = resultFor(grouped, "blog", href, () => ({
        kind: "blog",
        id: href,
        title: generated.page_title,
        description: generated.description,
        href,
        publishedAt: new Date(generated.published_at),
        authors: [...generated.authors],
        tags: [...generated.tags],
        chunks: [],
      }))
      if (result === undefined || generated.section_anchor.length === 0) return
      addChunk(result, {
        id,
        href: `${href}#${generated.section_anchor}`,
        title: generated.section_title,
        snippet: generated.excerpt || extractSnippet(chunk.text),
        score: chunk.score,
      })
      return
    }

    const metadata = chunk.metadata
    if (!Schema.is(DocumentationMetadata)(metadata)) return
    const generated = chunk.generated_metadata
    if (!Schema.is(DocumentationChunkMetadata)(generated)) return
    const parentHref = generated.parent_anchor
      ? `${generated.page_href}#${generated.parent_anchor}`
      : generated.page_href
    const result = resultFor(grouped, "documentation", parentHref, () => ({
      kind: "documentation",
      id: parentHref,
      breadcrumbs: [...generated.breadcrumbs],
      description: generated.parent_excerpt,
      title: generated.parent_title,
      href: parentHref,
      version: metadata.docs_version,
      chunks: [],
    }))
    if (result === undefined) return
    if (generated.section_anchor === generated.parent_anchor) return

    addChunk(result, {
      id,
      href: generated.section_anchor
        ? `${generated.page_href}#${generated.section_anchor}`
        : generated.page_href,
      title: generated.section_title,
      snippet: generated.excerpt || extractSnippet(chunk.text),
      score: chunk.score,
    })
  })

  return Array.from(grouped.values())
}
